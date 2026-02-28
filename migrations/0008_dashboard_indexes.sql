CREATE INDEX `sales_status_date_idx` ON `sales` (`status`, `transaction_date`);
--> statement-breakpoint
CREATE INDEX `sales_shift_status_idx` ON `sales` (`shift_id`, `status`);
--> statement-breakpoint
CREATE INDEX `sales_payment_status_date_idx` ON `sales` (`payment_method`, `status`, `transaction_date`);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_id_idx` ON `sale_items` (`sale_id`);
--> statement-breakpoint
CREATE INDEX `sale_items_product_id_idx` ON `sale_items` (`product_id`);
--> statement-breakpoint
CREATE INDEX `returns_sale_id_idx` ON `returns` (`sale_id`);
--> statement-breakpoint
CREATE INDEX `products_stock_idx` ON `products` (`stock`);
--> statement-breakpoint
CREATE INDEX `cashier_shifts_status_opened_idx` ON `cashier_shifts` (`status`, `opened_at`);
--> statement-breakpoint
CREATE INDEX `suspended_sales_cashier_created_idx` ON `suspended_sales` (`cashier_id`, `created_at`);

