import type { ColumnType, Generated } from "kysely";

type Nullable<T> = ColumnType<
    T | null,
    T | null | undefined,
    T | null
>;

type NullableTimestamp = ColumnType<
    Date | null,
    Date | null | undefined,
    Date | null
>;

type TriggerGenerated<T> = ColumnType<
    T,
    undefined,
    never
>;

export interface GenderTable {
    id: Generated<number>;
    code: string;
    label: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
}

export interface RateSetTable {
    id: Generated<number>;
    name: string;
    description: Nullable<string>;
    start_date: Date;
    end_date: NullableTimestamp;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
    deleted_at: NullableTimestamp;
}

export interface RateSetCategoryTable {
    id: Generated<number>;
    rate_set_id: number;
    category_number: string;
    category_name: string;
    sorting: Generated<number>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
    deleted_at: NullableTimestamp;
}

export interface RateSetSupportItemTable {
    id: Generated<number>;
    rate_set_id: number;
    category_id: number;
    item_number: string;
    item_name: string;
    unit: Nullable<string>;
    sorting: Generated<number>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
    deleted_at: NullableTimestamp;
}

export interface RateSetSupportItemTypeTable {
    id: Generated<number>;
    code: string;
    label: string;
    created_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
}

export interface RateSetSupportItemPriceTable {
    id: Generated<number>;
    rate_set_id: number;
    support_item_id: number;
    type_id: Nullable<number>;
    pricing_region_code: Nullable<string>;
    unit_price: Decimal;
    start_date: Date;
    end_date: NullableTimestamp;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deleted_at: NullableTimestamp;
}

export interface RateSetSupportItemAttributeTypeTable {
    code: string;
    label: string;
    created_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
}

export interface RateSetSupportItemAttributeTable {
    id: Generated<number>;
    support_item_id: number;
    attribute_code: string;
    value: Generated<boolean>;
    created_at: Generated<Date>;
}

export interface PricingRegionTable {
    code: string;
    label: string;
    full_label: string;
    created_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
}

export interface ClientTable {
    id: Generated<number>;
    first_name: string;
    last_name: string;

    // Generated automatically by the PostgreSQL trigger.
    name_parts: TriggerGenerated<string[]>;

    gender_id: number;
    dob: string;
    ndis_number: string;
    email: string;
    phone_number: Nullable<string>;
    address: string;
    unit_building: Nullable<string>;
    pricing_region: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
    deleted_at: NullableTimestamp;
}

export interface ProviderTable {
    id: Generated<number>;
    abn: string;
    name: string;

    // Generated automatically by the PostgreSQL trigger.
    name_parts: TriggerGenerated<string[]>;

    email: Nullable<string>;
    phone_number: Nullable<string>;
    address: Nullable<string>;
    unit_building: Nullable<string>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deactivated_at: NullableTimestamp;
    deleted_at: NullableTimestamp;
}

type Decimal = ColumnType<
    string | null,
    string | number | null | undefined,
    string | number | null
>;

export interface InvoiceTable {
    id: Generated<number>;
    client_id: Nullable<number>;
    provider_id: Nullable<number>;
    invoice_number: Nullable<string>;
    invoice_date: Nullable<string>;
    amount: Decimal;
    expected_amount: Decimal;
    status: Generated<"drafted" | "completed">;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deleted_at: NullableTimestamp;
}

export interface InvoiceItemTable {
    id: Generated<number>;
    invoice_id: number;
    rate_set_id: Nullable<number>;
    category_id: Nullable<number>;
    support_item_id: Nullable<number>;
    start_date: NullableTimestamp;
    end_date: NullableTimestamp;
    max_rate: Decimal;
    unit: Decimal;
    input_rate: Decimal;
    amount: Decimal;
    sort_order: Generated<number>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    deleted_at: NullableTimestamp;
}

export interface Database {
    rate_set: RateSetTable;
    rate_set_category: RateSetCategoryTable;
    rate_set_support_item: RateSetSupportItemTable;
    rate_set_support_item_type: RateSetSupportItemTypeTable;
    rate_set_support_item_price: RateSetSupportItemPriceTable;
    rate_set_support_item_attribute_type: RateSetSupportItemAttributeTypeTable;
    rate_set_support_item_attribute: RateSetSupportItemAttributeTable;
    gender: GenderTable;
    rate_set_support_item_pricing_region: PricingRegionTable;
    client: ClientTable;
    provider: ProviderTable;
    invoice: InvoiceTable;
    invoice_item: InvoiceItemTable;
}