"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeDagLayout } from "./dagLayout";

export interface LineageModel {
  id: string;
  uniqueId: string;
  name: string;
  dependsOn: string[];
}

export interface LineageTestResult {
  id: string;
  modelId: string | null;
  testName: string;
  status: string;
  failureMessage: string | null;
}

export interface LineageExplanation {
  testResultId: string;
  rootCause: string;
  suggestedFix: string | null;
}

const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
const NEUTRAL = "#8a8a86";

function ModelNode({ data }: NodeProps<Node<{ name: string; status: "good" | "critical" | "neutral" }>>) {
  const color = data.status === "critical" ? CRITICAL : data.status === "good" ? GOOD : NEUTRAL;
  return (
    <div
      className="rounded-md border bg-[var(--background)] px-3 py-2 text-xs shadow-sm"
      style={{ borderColor: color, borderWidth: 1.5 }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="flex items-center gap-1.5 font-medium">
        <span aria-hidden style={{ color }}>
          {data.status === "critical" ? "✕" : data.status === "good" ? "✓" : "○"}
        </span>
        {data.name}
      </span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { modelNode: ModelNode };

export function LineageGraph({
  models,
  testResults,
  explanations,
}: {
  models: LineageModel[];
  testResults: LineageTestResult[];
  explanations: LineageExplanation[];
}) {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const testsByModelId = useMemo(() => {
    const map = new Map<string, LineageTestResult[]>();
    for (const t of testResults) {
      if (!t.modelId) continue;
      map.set(t.modelId, [...(map.get(t.modelId) ?? []), t]);
    }
    return map;
  }, [testResults]);

  const explanationByTestId = useMemo(() => new Map(explanations.map((e) => [e.testResultId, e])), [explanations]);

  const { nodes, edges } = useMemo(() => {
    const positions = computeDagLayout(models.map((m) => ({ id: m.id, dependsOn: models.filter((x) => m.dependsOn.includes(x.uniqueId)).map((x) => x.id) })));
    const uniqueIdToId = new Map(models.map((m) => [m.uniqueId, m.id]));

    const nodes: Node[] = models.map((m) => {
      const tests = testsByModelId.get(m.id) ?? [];
      const status = tests.length === 0 ? "neutral" : tests.some((t) => t.status !== "pass") ? "critical" : "good";
      const pos = positions.get(m.id) ?? { x: 0, y: 0 };
      return {
        id: m.id,
        type: "modelNode",
        position: pos,
        data: { name: m.name, status },
      };
    });

    const edges: Edge[] = models.flatMap((m) =>
      m.dependsOn
        .map((parentUniqueId) => uniqueIdToId.get(parentUniqueId))
        .filter((parentId): parentId is string => !!parentId)
        .map((parentId) => ({
          id: `${parentId}->${m.id}`,
          source: parentId,
          target: m.id,
          animated: false,
        })),
    );

    return { nodes, edges };
  }, [models, testsByModelId]);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;
  const selectedTests = selectedModelId ? (testsByModelId.get(selectedModelId) ?? []) : [];

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="h-[480px] flex-1 rounded-lg border border-black/10 dark:border-white/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedModelId(node.id)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <aside className="flex w-full flex-col gap-3 md:w-80">
        {!selectedModel ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Click a model in the graph to see its test results and, for failures, the AI root-cause explanation.
          </p>
        ) : (
          <>
            <h3 className="font-medium">{selectedModel.name}</h3>
            {selectedTests.length === 0 ? (
              <p className="text-sm text-black/50 dark:text-white/50">No tests attached to this model.</p>
            ) : (
              selectedTests.map((t) => {
                const explanation = explanationByTestId.get(t.id);
                const failing = t.status !== "pass";
                return (
                  <div
                    key={t.id}
                    className="rounded-md border p-3 text-sm"
                    style={{ borderColor: failing ? CRITICAL : GOOD }}
                  >
                    <p className="font-medium" style={{ color: failing ? CRITICAL : GOOD }}>
                      {failing ? "✕" : "✓"} {t.testName}
                    </p>
                    {failing && (
                      <>
                        {t.failureMessage && <p className="mt-1 text-black/60 dark:text-white/60">{t.failureMessage}</p>}
                        {explanation ? (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <p>
                              <span className="font-medium">Root cause: </span>
                              {explanation.rootCause}
                            </p>
                            {explanation.suggestedFix && (
                              <p>
                                <span className="font-medium">Suggested fix: </span>
                                {explanation.suggestedFix}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 italic text-black/40 dark:text-white/40">No AI explanation available.</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </aside>
    </div>
  );
}
