CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `categories_name_unique` (`name`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50),
  `address` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `suppliers_name_unique` (`name`)
);
--> statement-breakpoint
ALTER TABLE `products`
  ADD COLUMN `category_id` int NULL,
  ADD COLUMN `supplier_id` int NULL,
  ADD COLUMN `min_stock` int NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `products`
  ADD CONSTRAINT `products_category_fk` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `products_supplier_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);
--> statement-breakpoint
CREATE INDEX `products_supplier_idx` ON `products` (`supplier_id`);

