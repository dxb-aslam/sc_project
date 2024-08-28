// Copyright (c) 2024, CT and contributors
// For license information, please see license.txt

frappe.ui.form.on("Estimation BOM", {
    refresh(frm) {
        frm.add_custom_button("Go To Quotation", () => {
            frappe.set_route("Form", "Quotation", frm.doc.quotation)
        })
    },
    bom_qty(frm) {
        recalculateForm(frm)
    },
    per_default_material_margin(frm) {
        updateMargin(frm.doc.raw_materials, frm.doc.per_default_material_margin)
    },
    per_default_activity_margin(frm) {
        updateMargin(frm.doc.activities, frm.doc.per_default_activity_margin)
    },
    validate(frm) {
        recalculateForm(frm, amount_only = true)
    }
});
frappe.ui.form.on("BOM Raw Material", {
    item_code(frm, cdt, cdn) {
        calculateRawMaterialRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    qty(frm, cdt, cdn) {
        calculateRawMaterialRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    unit_cost(frm, cdt, cdn) {
        calculateRawMaterialRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    per_margin(frm, cdt, cdn) {
        calculateRawMaterialRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    margin_amount(frm, cdt, cdn) {
        calculateRawMaterialRowTotal(frm, cdt, cdn, amount_only = true)
        calculateBOMTotal(frm)
    },
    raw_materials_add(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "per_margin", frm.doc.per_default_material_margin)
    }
});

frappe.ui.form.on("BOM Activity", {
    activity_type(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    hourly_cost(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    days(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    no_of_labours(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    per_margin(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn)
        calculateBOMTotal(frm)
    },
    margin_amount(frm, cdt, cdn) {
        calculateActivityRowTotal(frm, cdt, cdn, amount_only = true)
        calculateBOMTotal(frm)
    },
    activities_add(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "per_margin", frm.doc.per_default_activity_margin)
    }
});


const calculateRawMaterialRowTotal = (frm, cdt, cdn, amount_only = false) => {
    let row = locals[cdt][cdn]
    let total_cost = row.unit_cost * row.qty
    let margin_amount = amount_only ? row.margin_amount : (row.per_margin * total_cost / 100)
    frappe.model.set_value(cdt, cdn, "margin_amount", margin_amount)
    frappe.model.set_value(cdt, cdn, "total_cost", total_cost)
    frappe.model.set_value(cdt, cdn, "total_selling_amount", total_cost + margin_amount)
}

const calculateActivityRowTotal = (frm, cdt, cdn, amount_only = false) => {
    let row = locals[cdt][cdn]
    let hours = row.days * row.no_of_labours * row.hours_per_day
    let total_cost = hours * row.hourly_cost
    let margin_amount = amount_only ? row.margin_amount : (row.per_margin * total_cost / 100)
    frappe.model.set_value(cdt, cdn, "hours", hours)
    frappe.model.set_value(cdt, cdn, "margin_amount", margin_amount)
    frappe.model.set_value(cdt, cdn, "total_cost", total_cost)
    frappe.model.set_value(cdt, cdn, "total_selling_amount", total_cost + margin_amount)
}

const calculateBOMTotal = (frm) => {
    let total_material_cost = frm.doc.raw_materials.reduce((total, row) => total + row.total_cost, 0)
    let total_activities_cost = frm.doc.activities.reduce((total, row) => total + row.total_cost, 0)
    let total_material_margin = frm.doc.raw_materials.reduce((total, row) => total + row.margin_amount, 0)
    let total_activity_margin = frm.doc.activities.reduce((total, row) => total + row.margin_amount, 0)
    let total_cost = total_material_cost + total_activities_cost
    let total_margin = total_material_margin + total_activity_margin
    let total_selling_price = total_cost + total_margin
    let unit_selling_price = total_selling_price / frm.doc.bom_qty
    frm.set_value("total_material_cost", total_material_cost)
    frm.set_value("total_activities_cost", total_activities_cost)
    frm.set_value("total_cost", total_cost)
    frm.set_value("margin_amount", total_margin)
    frm.set_value("unit_selling_price", unit_selling_price)
    frm.set_value("total_selling_price", total_selling_price)

}

const recalculateForm = (frm, amount_only = false) => {
    $.each(frm.doc.raw_materials, (index, row) => {
        calculateRawMaterialRowTotal(frm, row.doctype, row.name, amount_only)
    })
    $.each(frm.doc.activities, (index, row) => {
        calculateActivityRowTotal(frm, row.doctype, row.name, amount_only)
    })
    calculateBOMTotal(frm)
}

const updateMargin = (items, margin) => {
    $.each(items, (i, row) => {
        frappe.model.set_value(row.doctype, row.name, "per_margin", margin)
    })
    recalculateForm(frm)
}