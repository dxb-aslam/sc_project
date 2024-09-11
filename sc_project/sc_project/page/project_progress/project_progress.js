frappe.pages['project-progress'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Project Progress',
		single_column: true
	});

	console.log(page)
	page.add_field({ label: "Project", fieldtype: "Link", fieldname: "project", options: "Project" })
	let d = new frappe.ui.Dialog({
		title: "Hello World"
	})

	page.add_button("Click Me", () => {
		d.show()
	})
	page.add_view(
		"main",
		'<div class="layout-main">\
					<div class="layout-main-section-wrapper">\
						<div class="layout-main-section">Hello World</div>\
						<div class="layout-footer hide"></div>\
					</div>\
				</div>'
	);
	page.set_view("main")

}
