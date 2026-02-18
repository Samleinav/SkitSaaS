CREATE TABLE "checkout_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checkout_order_id" integer NOT NULL,
	"line_order" integer DEFAULT 0 NOT NULL,
	"item_type" varchar(30) DEFAULT 'one_time_product' NOT NULL,
	"product_id" integer,
	"product_key" varchar(160),
	"name" varchar(160) NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_amount" integer NOT NULL,
	"total_amount" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "checkout_order_items_item_type_chk" CHECK ("checkout_order_items"."item_type" in ('one_time_product')),
	CONSTRAINT "checkout_order_items_quantity_chk" CHECK ("checkout_order_items"."quantity" > 0),
	CONSTRAINT "checkout_order_items_unit_amount_chk" CHECK ("checkout_order_items"."unit_amount" >= 0),
	CONSTRAINT "checkout_order_items_total_amount_chk" CHECK ("checkout_order_items"."total_amount" >= 0),
	CONSTRAINT "checkout_order_items_currency_chk" CHECK (char_length("checkout_order_items"."currency") between 3 and 10)
);--> statement-breakpoint
ALTER TABLE "checkout_order_items" ADD CONSTRAINT "checkout_order_items_checkout_order_id_checkout_orders_id_fk" FOREIGN KEY ("checkout_order_id") REFERENCES "public"."checkout_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_order_items_checkout_order_idx" ON "checkout_order_items" USING btree ("checkout_order_id");--> statement-breakpoint
CREATE INDEX "checkout_order_items_checkout_order_line_order_idx" ON "checkout_order_items" USING btree ("checkout_order_id","line_order","id");--> statement-breakpoint
CREATE INDEX "checkout_order_items_product_idx" ON "checkout_order_items" USING btree ("product_id");
