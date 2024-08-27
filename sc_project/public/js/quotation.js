frappe.ui.form.on('Quotation', {
    refresh(frm) {
    }
})
frappe.ui.form.on('Quotation Item', {
    custom_open_bom(frm, cdt, cdn) {
        let row = locals[cdt][cdn]
        makeBOM(frm, row)
    }
})

let makeBOM = (frm, row) => {
    if (row.custom_estimation_bom) {
        frappe.set_route("Form", "Estimation BOM", row.custom_estimation_bom)
    }
    else {
        frappe.prompt({ label: "Copy From BOM", fieldtype: "Link", options: "Estimation BOM", fieldname: 'bom' }, v => {
            frappe.call("sc_project.events.quotation.make_new_bom",
                {
                    quotation: frm.doc.name,
                    title: row.item_name,
                    bom_qty: row.qty,
                    quotation_item: row.name,
                    existing: v.bom
                }).then(r => {
                    frappe.model.set_value(row.doctype, row.name, "custom_estimation_bom", r.message)
                    frm.save()
                    frappe.set_route("Form", "Estimation BOM", r.message)
                })
        })
    }
}