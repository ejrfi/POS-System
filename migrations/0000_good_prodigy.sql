CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(50),
	`total_points` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'percentage',
	`value` decimal(10,2) NOT NULL,
	`start_date` timestamp,
	`end_date` timestamp,
	`active` boolean DEFAULT true,
	`description` text,
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `point_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customer_id` int NOT NULL,
	`sale_id` int,
	`points_change` int NOT NULL,
	`reason` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `point_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`brand_id` int,
	`price` decimal(10,2) NOT NULL DEFAULT '0',
	`stock` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `return_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`return_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`refund_amount` decimal(10,2) NOT NULL,
	CONSTRAINT `return_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`return_date` timestamp DEFAULT (now()),
	`total_refund` decimal(12,2) NOT NULL,
	`reason` text NOT NULL,
	CONSTRAINT `returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sale_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` int NOT NULL,
	`price_at_sale` decimal(10,2) NOT NULL,
	`discount_at_sale` decimal(10,2) DEFAULT '0',
	`subtotal` decimal(12,2) NOT NULL,
	CONSTRAINT `sale_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_no` varchar(100) NOT NULL,
	`transaction_date` timestamp DEFAULT (now()),
	`cashier_id` int,
	`customer_id` int,
	`subtotal` decimal(12,2) NOT NULL,
	`discount_amount` decimal(12,2) DEFAULT '0',
	`final_amount` decimal(12,2) NOT NULL,
	`payment_method` varchar(50) NOT NULL DEFAULT 'cash',
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_invoice_no_unique` UNIQUE(`invoice_no`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`password` text NOT NULL,
	`full_name` text NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'cashier',
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
