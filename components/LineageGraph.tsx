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
import styles from "./LineageGraph.module.css";

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
const NEUTRAL = "#94a3b8";

function ModelNode({ data }: NodeProps<Node<{ name: string; status: "good" | "critical" | "neutral" }>>) {
  const color = data.status === "critical" ? CRITICAL : data.status === "good" ? GOOD : NEUTRAL;
  return (
    <div className={styles.node} style={{ borderColor: color }}>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className={styles.nodeLabel}>
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
    const positions = computeDagLayout(
      models.map((m) => ({
        id: m.id,
        dependsOn: models.filter((x) => m.dependsOn.includes(x.uniqueId)).map((x) => x.id),
      })),
    );
    const uniqueIdToId = new Map(models.map((m) => [m.uniqueId, m.id]));

    const nodes: Node[] = models.map((m) => {
      const tests = testsByModelId.get(m.id) ?? [];
      const status = tests.length === 0 ? "neutral" : tests.some((t) => t.status !== "pass") ? "critical" : "good";
      const pos = positions.get(m.id) ?? { x: 0, y: 0 };
      return { id: m.id, type: "modelNode", position: pos, data: { name: m.name, status } };
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
          style: { stroke: "#e5e7eb" },
        })),
    );

    return { nodes, edges };
  }, [models, testsByModelId]);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;
  const selectedTests = selectedModelId ? (testsByModelId.get(selectedModelId) ?? []) : [];

  return (
    <div className={styles.layout}>
      <div className={styles.graph}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedModelId(node.id)}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e5e7eb" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <aside className={styles.sidebar}>
        {!selectedModel ? (
          <div className={styles.empty}>
            Click a model in the graph to see its test results and, for failures, the AI root-cause explanation.
          </div>
        ) : (
          <div className={styles.panel}>
            <p className={styles.panelTitle}>{selectedModel.name}</p>
            {selectedTests.length === 0 ? (
              <p className={styles.message}>No tests attached to this model.</p>
            ) : (
              selectedTests.map((t) => {
                const explanation = explanationByTestId.get(t.id);
                const failing = t.status !== "pass";
                const color = failing ? CRITICAL : GOOD;
                return (
                  <div key={t.id} className={styles.test} style={{ borderColor: color }}>
                    <p className={styles.testName} style={{ color }}>
                      {failing ? "✕" : "✓"} {t.testName}
                    </p>
                    {failing && (
                      <>
                        {t.failureMessage && <p className={styles.message}>{t.failureMessage}</p>}
                        {explanation ? (
                          <div className={styles.explanation}>
                            <p>
                              <strong>Root cause: </strong>
                              {explanation.rootCause}
                            </p>
                            {explanation.suggestedFix && (
                              <p>
                                <strong>Suggested fix: </strong>
                                {explanation.suggestedFix}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className={styles.message}>No AI explanation available.</p>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
