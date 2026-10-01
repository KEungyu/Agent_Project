CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` text NOT NULL,
	`at` text NOT NULL,
	`kind` text NOT NULL,
	`request_id` text,
	`detail` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `trip_boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `replies` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`received_at` text NOT NULL,
	`raw_ko` text NOT NULL,
	`interpretation` text,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `request_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL,
	`note` text,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`type_id` text NOT NULL,
	`target_id` text,
	`parent_request_id` text,
	`round` integer DEFAULT 1 NOT NULL,
	`status` text NOT NULL,
	`channel` text,
	`slots` text NOT NULL,
	`draft` text,
	`approval` text,
	`sent` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `trip_boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `stays` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`name_ko` text,
	`address_ko` text,
	`email` text,
	`phone` text,
	`booking_ref` text,
	`guest_name` text,
	`check_in_date` text,
	`check_out_date` text,
	`expected_arrival` text,
	`checkin_cutoff` text,
	`checkout_time` text,
	`field_sources` text NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `trip_boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `trip_boards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_language` text DEFAULT 'en' NOT NULL,
	`traveler_role` text DEFAULT 'traveler' NOT NULL,
	`arrival` text,
	`departure` text,
	`itinerary` text NOT NULL,
	`proactive` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
