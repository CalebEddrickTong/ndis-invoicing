"use client";

import { Button, Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export default function Home() {
    return (
        <main className="min-h-screen bg-gray-100 p-8">
            <div className="mx-auto max-w-3xl">
                <Card>
                    <Title level={1}>NDIS Invoicing Platform</Title>

                    <Paragraph>
                        Development environment setup is working.
                    </Paragraph>

                    <Button type="primary">
                        Test Ant Design
                    </Button>
                </Card>
            </div>
        </main>
    );
}