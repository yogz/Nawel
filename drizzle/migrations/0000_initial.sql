CREATE TABLE IF NOT EXISTS `days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text(10) NOT NULL,
	`title` text
);
CREATE TABLE IF NOT EXISTS `meals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day_id` integer NOT NULL,
	`title` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `days`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
CREATE TABLE IF NOT EXISTS `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meal_id` integer NOT NULL,
	`name` text NOT NULL,
	`quantity` text,
	`note` text,
	`person_id` integer,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
