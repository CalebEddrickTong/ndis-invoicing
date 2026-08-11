"use client";

import { useEffect, useState } from "react";
import {
    Button,
    Card,
    DatePicker,
    Form,
    Input,
    Modal,
    Popconfirm,
    Table,
    Typography,
    Upload,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";

const { Title } = Typography;
const { TextArea } = Input;

type RateSet = {
    id: number;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    created_at: string;
    updated_at: string;
    deactivated_at: string | null;
};

type RateSetFormValues = {
    name: string;
    description?: string;
    start_date: Dayjs;
    end_date?: Dayjs;
};

export default function RateSetsPage() {
    const [form] = Form.useForm<RateSetFormValues>();

    const [rateSets, setRateSets] = useState<RateSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [editingRateSet, setEditingRateSet] =
        useState<RateSet | null>(null);

    const [importingRateSetId, setImportingRateSetId] =
        useState<number | null>(null);

    async function loadRateSets() {
        setLoading(true);

        try {
            const response = await fetch("/api/rate-sets");
            const result = await response.json();

            if (response.ok) {
                setRateSets(result.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setMounted(true);
        loadRateSets();
    }, []);

    async function handleCreate(values: RateSetFormValues) {
        setSaving(true);

        try {
            const response = await fetch(
                editingRateSet
                    ? `/api/rate-sets/${editingRateSet.id}`
                    : "/api/rate-sets",
                {
                    method: editingRateSet ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: values.name,
                        description: values.description || null,
                        start_date: values.start_date.format("YYYY-MM-DD"),
                        end_date: values.end_date
                            ? values.end_date.format("YYYY-MM-DD")
                            : null,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                if (result.errors) {
                    form.setFields(
                        Object.entries(result.errors).map(([name, error]) => ({
                            name: name as keyof RateSetFormValues,
                            errors: [String(error)],
                        }))
                    );
                }

                return;
            }

            form.resetFields();
            setModalOpen(false);
            setEditingRateSet(null);
            await loadRateSets();
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteRateSet(id: number) {
        const response = await fetch(`/api/rate-sets/${id}`, {
            method: "DELETE",
        });

        if (response.ok) {
            await loadRateSets();
        }
    }

    async function handleImportRateSet(
        rateSetId: number,
        file: File
    ) {
        setImportingRateSetId(rateSetId);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(
                `/api/rate-sets/${rateSetId}/import`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok) {
                window.alert(
                    result.message ?? "Failed to import Excel catalogue."
                );
                return;
            }

            window.alert("Excel catalogue imported successfully.");

            await loadRateSets();
        } catch {
            window.alert("Failed to import Excel catalogue.");
        } finally {
            setImportingRateSetId(null);
        }
    }

    return (
        <main className="p-6">
            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <Title level={2} style={{ margin: 0 }}>
                        Rate Sets
                    </Title>

                    <Button
                        type="primary"
                        onClick={() => {
                            setEditingRateSet(null);
                            form.resetFields();
                            setModalOpen(true);
                        }}
                    >
                        Add Rate Set
                    </Button>
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={[
                        {
                            title: "Name",
                            dataIndex: "name",
                        },
                        {
                            title: "Description",
                            dataIndex: "description",
                        },
                        {
                            title: "Start Date",
                            dataIndex: "start_date",
                            render: (value: string) =>
                                dayjs(value).format("YYYY-MM-DD"),
                        },
                        {
                            title: "End Date",
                            dataIndex: "end_date",
                            render: (value: string | null) =>
                                value
                                    ? dayjs(value).format("YYYY-MM-DD")
                                    : "Open-ended",
                        },
                        {
                            title: "Actions",
                            key: "actions",
                            render: (_, rateSet: RateSet) => (
                                <div className="flex gap-2">
                                    <Button
                                        type="link"
                                        onClick={async () => {
                                            const response = await fetch(
                                                `/api/rate-sets/${rateSet.id}`
                                            );
                                            const result = await response.json();

                                            if (response.ok) {
                                                setEditingRateSet(result.data);

                                                form.setFieldsValue({
                                                    name: result.data.name,
                                                    description:
                                                        result.data.description ?? undefined,
                                                    start_date: dayjs(result.data.start_date),
                                                    end_date: result.data.end_date
                                                        ? dayjs(result.data.end_date)
                                                        : undefined,
                                                });

                                                setModalOpen(true);
                                            }
                                        }}
                                    >
                                        Edit
                                    </Button>

                                    <Upload
                                        accept=".xlsx,.xls"
                                        showUploadList={false}
                                        beforeUpload={(file) => {
                                            void handleImportRateSet(rateSet.id, file);
                                            return false;
                                        }}
                                    >
                                        <Button
                                            type="link"
                                            loading={importingRateSetId === rateSet.id}
                                        >
                                            Import Excel
                                        </Button>
                                    </Upload>

                                    <Popconfirm
                                        title="Delete rate set?"
                                        description="This rate set will be removed from the active list."
                                        okText="Delete"
                                        cancelText="Cancel"
                                        onConfirm={() =>
                                            handleDeleteRateSet(rateSet.id)
                                        }
                                    >
                                        <Button type="link" danger>
                                            Delete
                                        </Button>
                                    </Popconfirm>
                                </div>
                            ),
                        },
                    ]}
                    dataSource={rateSets}
                    pagination={false}
                />
            </Card>

            {mounted && (
                <Modal
                    title={editingRateSet ? "Edit Rate Set" : "Add Rate Set"}
                    open={modalOpen}
                    forceRender
                    onCancel={() => {
                        form.resetFields();
                        setEditingRateSet(null);
                        setModalOpen(false);
                    }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    okText={editingRateSet ? "Save Changes" : "Create Rate Set"}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreate}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: "Rate set name is required.",
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            label="Description"
                            name="description"
                        >
                            <TextArea rows={3} />
                        </Form.Item>

                        <Form.Item
                            label="Start Date"
                            name="start_date"
                            rules={[
                                {
                                    required: true,
                                    message: "Start date is required.",
                                },
                            ]}
                        >
                            <DatePicker
                                format="YYYY-MM-DD"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="End Date"
                            name="end_date"
                            dependencies={["start_date"]}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const startDate = getFieldValue("start_date");

                                        if (
                                            !value ||
                                            !startDate ||
                                            !value.isBefore(startDate, "day")
                                        ) {
                                            return Promise.resolve();
                                        }

                                        return Promise.reject(
                                            new Error(
                                                "End date must be on or after the start date."
                                            )
                                        );
                                    },
                                }),
                            ]}
                        >
                            <DatePicker
                                format="YYYY-MM-DD"
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </main>
    );
}