import frappe

def updateSOreference(doc,method=None):
    for item in doc.items:
        if item.quotation_item:
            est_bom = frappe.db.get_value("Quotation Item",item.quotation_item,"custom_estimation_bom")
            if est_bom:
                frappe.db.set_value("Estimation BOM",est_bom,{"sales_order":doc.name})

    