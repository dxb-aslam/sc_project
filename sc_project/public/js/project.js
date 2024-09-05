frappe.ui.form.on('Project', {
    refresh(frm) {
        promptMaterialRequest(frm)
        promptProgressUpdate(frm)
    }
})

const promptMaterialRequest = (frm) => {
    frm.add_custom_button("Request Material", () => {
        if (!frm.doc.custom_source_warehouse || !frm.doc.custom_work_in_progress_warehouse)
            frappe.throw("Please Add Source and Work In Progress Warehouses !")
        frappe.call({
            method: 'sc_project.events.project.get_bom_items',
            args: {
                project: frm.doc.name
            },
            callback: function (r) {
                if (!r.exc) {
                    let dialog = new frappe.ui.Dialog({
                        title: "New Transfer Request",
                        fields: [
                            {
                                label: "From Warehouse",
                                fieldname: "from_warehouse",
                                fieldtype: "Link",
                                options: "Warehouse",
                                read_only: 1,
                                default: frm.doc.custom_source_warehouse
                            },
                            {
                                fieldname: "cb1",
                                fieldtype: "Column Break",
                            },
                            {
                                label: "To Warehouse",
                                fieldname: "to_warehouse",
                                fieldtype: "Link",
                                options: "Warehouse",
                                read_only: 1,
                                default: frm.doc.custom_work_in_progress_warehouse
                            },
                            {
                                fieldname: "cb1",
                                fieldtype: "Column Break",
                            },
                            {
                                label: "Required By",
                                fieldname: "reqd_by",
                                fieldtype: "Date",
                                default: "Today",
                                reqd: 1
                            },
                            {
                                fieldname: "sb1",
                                fieldtype: "Section Break",
                            },
                            {
                                label: "Project BOM Items",
                                fieldname: "items",
                                fieldtype: "Table",
                                reqd: 1,
                                fields: [
                                    { in_list_view: 1, columns: 2, read_only: 1, label: "Item Code", fieldname: "item_code", fieldtype: "Link", options: "Item" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "BOM Qty", fieldname: "bom_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Transferred Qty", fieldname: "transferred_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Pending Qty", fieldname: "pending_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Requested Qty", fieldname: "open_mr_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "In Stock", fieldname: "actual_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 0, label: "Current Required", fieldname: "current_qty", fieldtype: "Float" },
                                ],
                                data: r.message,
                            },
                        ],
                        size: 'large',
                        primary_action_label: "Create Material Request",
                        primary_action: (values) => {
                            processMaterialRequest(frm, values)
                            dialog.hide()
                        }
                    })
                    dialog.show()
                }
            }
        });
    })

}


const processMaterialRequest = (frm, values) => {
    $.each(values.items, (i, item) => {
        if (item.current_qty > item.pending_qty - item.open_mr_qty) {
            frappe.throw(`You cannot use more than the BOM Qty`)
        }
    })
    frappe.call({
        method: 'sc_project.events.project.process_mr',
        args: {
            project: frm.doc.name,
            values: values
        }
    }).then(r => {
        frappe.msgprint(`
            Material Request <b><a href="/app/material-request/${r.message}">${r.message}</a></b> is Submitted.
            `)
    });
}


const promptProgressUpdate = (frm) => {
    frm.add_custom_button("Update Progress", () => {
        if (!frm.doc.custom_source_warehouse || !frm.doc.custom_work_in_progress_warehouse)
            frappe.throw("Please Add Source and Work In Progress Warehouses !")
        frappe.call({
            method: 'sc_project.events.project.get_transferred_item_list',
            args: {
                project: frm.doc.name
            },
            callback: function (r) {
                if (!r.exc) {
                    let dialog = new frappe.ui.Dialog({
                        title: "Update Progress",
                        fields: [
                            {
                                label: "Work In Progress Warehouse",
                                fieldname: "wip_warehouse",
                                fieldtype: "Link",
                                options: "Warehouse",
                                read_only: 1,
                                default: frm.doc.custom_work_in_progress_warehouse
                            },
                            {
                                fieldname: "cb1",
                                fieldtype: "Column Break",
                            },
                            {
                                label: "Required By",
                                fieldname: "reqd_by",
                                fieldtype: "Date",
                                default: "Today",
                                reqd: 1
                            },
                            {
                                fieldname: "sb1",
                                fieldtype: "Section Break",
                                label: "Issue Materials"
                            },
                            {
                                label: "Transferred Items",
                                fieldname: "items",
                                fieldtype: "Table",
                                reqd: 1,
                                fields: [
                                    { in_list_view: 1, columns: 3, read_only: 1, label: "Item Code", fieldname: "item_code", fieldtype: "Link", options: "Item" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "BOM Qty", fieldname: "bom_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Transferred Qty", fieldname: "transferred_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Available Qty", fieldname: "available_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 1, read_only: 1, label: "Consumed Qty", fieldname: "consumed_qty", fieldtype: "Float" },
                                    { in_list_view: 1, columns: 2, read_only: 0, label: "Qty to Issue", fieldname: "qty_to_issue", fieldtype: "Float" },
                                ],
                                data: r.message,
                            },
                            {
                                fieldname: "sb2",
                                fieldtype: "Section Break",
                                label: "Update Labor Resources"
                            },
                            {
                                label: "Employees",
                                fieldname: "employees",
                                fieldtype: "Table",
                                fields: [
                                    { in_list_view: 1, columns: 2, read_only: 0, label: "Employee ID", fieldname: "employee", fieldtype: "Link", options: "Employee" },
                                    { in_list_view: 1, columns: 2, read_only: 0, label: "Activity Type", fieldname: "activity_type", fieldtype: "Link", options: "Activity Type", reqd: 1 },
                                    { in_list_view: 1, columns: 2, read_only: 0, label: "Hours", fieldname: "hours", fieldtype: "Float", default: 8 },
                                ]
                            },

                        ],
                        size: 'large',
                        primary_action_label: "Update",
                        primary_action: (values) => {
                            processProjectUpdate(frm, values)
                            dialog.hide()
                        }
                    })
                    dialog.show()
                }
            }
        });
    })

}

const processProjectUpdate = (frm, values) => {
    $.each(values.items, (i, item) => {
        if (item.qty_to_issue > item.available_qty) {
            frappe.throw(`You don't have enough stock to make this issue`)
        }
    })
    frappe.call({
        method: 'sc_project.events.project.update_project',
        args: {
            project: frm.doc.name,
            values: values
        }
    }).then(r => {
        frappe.msgprint(`
           Progress Updated:<br>
           Stock Entry: <b><a href="/app/stock-entry/${r.message.stock_entry}">${r.message.stock_entry}</a></b><br>
           Timesheets: ${r.message.ts_list.map(ts => `<b><a href="/app/timesheet/${ts}">${ts}</a></b>`).join(", ")}
            `)
    });
}