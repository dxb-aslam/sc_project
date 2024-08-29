import frappe


def updateProjectReference(doc,method=None):
    boms = frappe.get_all("Estimation BOM",{"sales_order":doc.sales_order})
    for bom in boms:
        frappe.db.set_value("Estimation BOM",bom.name,{"project":doc.name})
    make_project_bom(doc)
    
def removeProjectRef(doc,method=None):
    boms = frappe.get_all("Estimation BOM",{"project":doc.name})
    for bom in boms:
        frappe.db.set_value("Estimation BOM",bom.name,{"project":""})

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
