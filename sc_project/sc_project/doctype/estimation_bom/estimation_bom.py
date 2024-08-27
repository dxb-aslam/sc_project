# Copyright (c) 2024, CT and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class EstimationBOM(Document):
	def on_update(self):
		quotation = frappe.get_doc("Quotation",self.quotation)
		for item in quotation.items:
			if item.custom_estimation_bom == self.name:
				item.qty = self.bom_qty
				item.item_name = self.title
				item.rate = self.unit_selling_price
				quotation.save()
				return

