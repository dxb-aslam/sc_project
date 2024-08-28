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

def delete_unlinked_boms(doc,method=None):
    unlinked_docs = frappe.get_all("Estimation BOM",{"quotation":doc.name})
    for bom in unlinked_docs:
        if not bom.name in [row.custom_estimation_bom for row in doc.items ]:
            frappe.delete_doc("Estimation BOM",bom.name)
            frappe.msgprint(f"BOM {bom.name} Deleted!")