from erpnext.setup.doctype import employee
import frappe
import json

import frappe.utils

# update project reference in the Estimation
def updateProjectReference(doc,method=None):
    boms = frappe.get_all("Estimation BOM",{"sales_order":doc.sales_order})
    for bom in boms:
        frappe.db.set_value("Estimation BOM",bom.name,{"project":doc.name})
    make_project_bom(doc)

# remove project reference
def removeProjectRef(doc,method=None):
    boms = frappe.get_all("Estimation BOM",{"project":doc.name})
    for bom in boms:
        frappe.db.set_value("Estimation BOM",bom.name,{"project":""})

# create Project BOM from Estimation BOMs
def make_project_bom(doc):
    raw_materials = frappe.db.sql("""SELECT * FROM `tabEstimation BOM` eb
                                  JOIN `tabBOM Raw Material` brm ON brm.parent = eb.name AND brm.parenttype = "Estimation BOM"
                                  WHERE eb.project = %s
                                  GROUP BY brm.item_code
                                  """,doc.name,as_dict=True)
    activities = frappe.db.sql("""SELECT * FROM `tabEstimation BOM` eb
                                  JOIN `tabBOM Activity` ba ON ba.parent = eb.name AND ba.parenttype = "Estimation BOM"
                                  WHERE eb.project = %s
                                  GROUP BY ba.activity_type
                                  """,doc.name,as_dict=True)
    proj_bom = frappe.new_doc("Project BOM")
    proj_bom.project = doc.name
    for row in raw_materials:
        proj_bom.append("raw_materials",row)
    for row in activities:
        proj_bom.append("activities",row)
    proj_bom.insert()
    doc.db_set("custom_project_bom",proj_bom.name)

   
# get bom items with qtys
@frappe.whitelist()
def get_bom_items(project):
    bom_id = frappe.db.get_value("Project",project,"custom_project_bom")
    source_warehouse = frappe.db.get_value("Project",project,"custom_source_warehouse") or None
    wip_warehouse = frappe.db.get_value("Project",project,"custom_work_in_progress_warehouse") or None
    if not bom_id:
        frappe.throw("No BOM Available for this Project")
        return
    project_bom = frappe.get_doc("Project BOM",bom_id)
    bom_item_list = []
    for item in project_bom.raw_materials:
        mr_qty = get_item_mr_qty(item.item_code,project)
        transferred_qty = get_item_transferred_qty(item.item_code,project,wip_warehouse)
        # frappe.msgprint(f"{item.item_code} - {transferred_qty}")
        actual_qty = get_actual_qty(item.item_code,source_warehouse)
        bom_item_list.append(
            {
                "item_code":item.item_code,
                "bom_qty":item.qty,
                "used_qty":transferred_qty,
                "pending_qty":item.qty-transferred_qty,
                "open_mr_qty":mr_qty,
                "actual_qty":actual_qty,
                "current_qty":item.qty-transferred_qty-mr_qty,
             }
        )
    if bom_item_list:
        return bom_item_list
    else:
        frappe.throw("No Items in the Project BOM")

## get actual, requested, received, consumed, pending_qty for bom items
def get_item_mr_qty(item_code,project):
    return frappe.db.sql("""
    SELECT SUM(mri.qty-mri.received_qty) FROM `tabMaterial Request Item` mri JOIN `tabMaterial Request` mr ON mr.name = mri.parent
                  WHERE mri.docstatus = 1 AND mr.status != "Stopped" AND mr.material_request_type = "Purchase"
                  AND mri.item_code = %s AND  mri.project = %s
        """,(item_code,project))[0][0] or 0

def get_item_transferred_qty(item_code,project,wip_warehouse):
    return frappe.db.sql("""
    SELECT SUM(sle.actual_qty) FROM `tabPurchase Receipt` pr JOIN `tabStock Ledger Entry` sle ON sle.voucher_no = pr.name
                  WHERE pr.docstatus = 1 AND sle.item_code = %s AND sle.project = %s AND sle.warehouse = %s
        """,(item_code,project,wip_warehouse))[0][0] or 0

def get_item_consumed_qty(item_code,project,wip_warehouse):
    return frappe.db.sql("""
    SELECT -SUM(actual_qty) FROM `tabStock Entry` se JOIN `tabStock Ledger Entry` sle ON sle.voucher_no = se.name
                  WHERE se.docstatus = 1 AND sle.item_code = %s AND sle.project = %s AND sle.warehouse = %s AND se.purpose = "Material Issue"
        """,(item_code,project,wip_warehouse))[0][0] or 0

def get_actual_qty(item_code,warehouse=None):
    query = """SELECT SUM(actual_qty) FROM `tabBin` bin WHERE item_code = %s"""
    if warehouse:
        query += f" AND warehouse = {frappe.db.escape(warehouse)}"
    return frappe.db.sql(query,item_code)[0][0] or 0

# process MR
@frappe.whitelist()
def process_mr(project,values):
    values = json.loads(values)
    project = frappe.get_doc("Project",project)
    items = [item for item in values['items'] if item["current_qty"] > 0]
    if not items:
        frappe.throw("No Items to request")
        return
    mr_doc = frappe.get_doc({
        "doctype":"Material Request",
        "material_request_type":"Purchase",
        "set_from_warehouse":values["from_warehouse"],
        "set_warehouse":values["to_warehouse"],
        "schedule_date":values["reqd_by"],
        "items":[{
            "item_code":item["item_code"],
            "project":project.name,
            "qty":item["current_qty"],
        } for item in items]
    }).insert()
    mr_doc.submit()
    return mr_doc.name

# project progress update
@frappe.whitelist()
def update_project(project,values):
    values = json.loads(values)
    project = frappe.get_doc("Project",project)
    items = values.get("items")
    ts_array = []
    if items:
        items = [item for item in values['items'] if item["qty_to_issue"] > 0]
    if items:
        se_doc = frappe.get_doc({
            "doctype":"Stock Entry",
            "stock_entry_type":"Material Issue",
            "project":project.name,
            "from_warehouse":values["wip_warehouse"],
            "items":[{
                "item_code":item["item_code"],
                "project":project.name,
                "qty":item["qty_to_issue"]} for item in items]
        }).insert()
        se_doc.submit()
    employees = values.get("employees")
    if employees:
        employees = [emp for emp in values.get('employees') if emp["hours"] > 0]
    if employees:
        for emp in employees:
            ts_doc = frappe.get_doc({
                "doctype":"Timesheet",
                "employee":emp['employee'],
                "project":project,
                "time_logs":[{
                    "activity_type":emp["activity_type"],
                    "hours":emp["hours"],
                    "project":project,
                    "from_time":frappe.utils.add_to_date(frappe.utils.now_datetime(),hours=-(emp.get("hours"))),
                    "to_time":frappe.utils.now_datetime()}]
            }).insert()
            ts_doc.submit()
            ts_array.append(ts_doc.name)
    if not items or not employees:
        frappe.throw("No Progress to Update.")
    return {"stock_entry":se_doc.name,"ts_list":ts_array}

## get transferred items to the project
@frappe.whitelist()
def get_transferred_item_list(project):
    bom_id = frappe.db.get_value("Project",project,"custom_project_bom")
    source_warehouse = frappe.db.get_value("Project",project,"custom_source_warehouse") or None
    wip_warehouse = frappe.db.get_value("Project",project,"custom_work_in_progress_warehouse") or None
    if not bom_id:
        frappe.throw("No BOM Available for this Project")
        return
    project_bom = frappe.get_doc("Project BOM",bom_id)
    bom_item_list = []
    for item in project_bom.raw_materials:
        transferred_qty = get_item_transferred_qty(item.item_code,project,wip_warehouse)
        consumed_qty = get_item_consumed_qty(item.item_code,project,wip_warehouse)
        available_qty = get_actual_qty(item.item_code,wip_warehouse)
        bom_item_list.append(
            {
                "item_code":item.item_code,
                "bom_qty":item.qty,
                "transferred_qty":transferred_qty,
                "available_qty":available_qty,
                "consumed_qty":consumed_qty,
                "qty_to_issue":transferred_qty-consumed_qty
             }
        )
    if bom_item_list:
        return bom_item_list
    else:
        frappe.throw("No Items in the Project BOM")
