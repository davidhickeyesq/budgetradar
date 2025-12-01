"use client";

import { useEffect, useState } from "react";
import { AreaChart, Card, Title, Text } from "@tremor/react";

interface TrustChartProps {
    accountId: string;
    channelName: string;
}

interface ChartDataPoint {
    date: string;
    Actual: number;
    Predicted: number;
}

interface Metrics {
    r_squared: number;
}

export default function TrustChart({ accountId, channelName }: TrustChartProps) {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch("http://localhost:8000/api/model-quality", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        account_id: accountId,
                        channel_name: channelName,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch model quality data");
                }

                const data = await response.json();

                // Transform data for Tremor
                const transformedData = data.dates.map((date: string, index: number) => ({
                    date: date,
                    Actual: data.actual_values[index],
                    Predicted: data.predicted_values[index] || 0,
                }));

                setChartData(transformedData);
                setMetrics(data.metrics);
            } catch (err) {
                console.error(err);
                setError("Could not load chart data");
            } finally {
                setIsLoading(false);
            }
        }

        if (accountId && channelName) {
            fetchData();
        }
    }, [accountId, channelName]);

    if (isLoading) {
        return (
            <Card>
                <Title>Model Fit: {channelName}</Title>
                <div className="h-72 flex items-center justify-center">
                    <Text>Loading...</Text>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Title>Model Fit: {channelName}</Title>
                <div className="h-72 flex items-center justify-center">
                    <Text color="red">{error}</Text>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <Title>Model Fit: {channelName}</Title>
                {metrics && (
                    <Text>
                        R²: <span className="font-bold">{metrics.r_squared.toFixed(2)}</span>
                    </Text>
                )}
            </div>
            <AreaChart
                className="h-72 mt-4"
                data={chartData}
                index="date"
                categories={["Actual", "Predicted"]}
                colors={["blue", "cyan"]}
                valueFormatter={(number) =>
                    `$${Intl.NumberFormat("us").format(number).toString()}`
                }
                showAnimation={true}
                yAxisWidth={60}
            />
        </Card>
    );
}
