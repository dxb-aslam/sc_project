import frappe

@frappe.whitelist()
def make_new_bom(quotation, title, bom_qty, quotation_item,existing=None):
    if existing:
        bom = frappe.copy_doc(frappe.get_doc("Estimation BOM",existing))
        bom.insert()
        return bom.name
    else:
        bom = frappe.get_doc({
            "doctype":"Estimation BOM",
            "quotation":quotation,
            "title":title,
            "bom_qty":bom_qty,
            "quotation_item":quotation_item,
            }).insert()
        return bom.name