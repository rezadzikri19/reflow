/**
 * Custom Node Components for Process Flowchart
 *
 * This module exports all custom node components compatible with @xyflow/react.
 * Each node type represents a different element in the process flowchart.
 */

// Node type exports
export { default as StartNode } from './StartNode';
export { default as EndNode } from './EndNode';
export { default as ProcessNode } from './ProcessNode';
export { default as DecisionNode } from './DecisionNode';
export { default as SubprocessNode } from './SubprocessNode';
export { default as ParallelNode } from './ParallelNode';
export { default as DelayNode } from './DelayNode';

// Type exports for external use
export type { ProcessNodeData, BaseNodeData } from '../../../types/index';

/**
 * Node types map for React Flow
 * Import this object and pass it to the `nodeTypes` prop of ReactFlow component
 *
 * @example
 * ```tsx
 * import { nodeTypes } from './components/flowchart/nodes';
 *
 * <ReactFlow nodeTypes={nodeTypes} ... />
 * ```
 */
import StartNode from './StartNode';
import EndNode from './EndNode';
import ProcessNode from './ProcessNode';
import DecisionNode from './DecisionNode';
import SubprocessNode from './SubprocessNode';
import ParallelNode from './ParallelNode';
import DelayNode from './DelayNode';

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  process: ProcessNode,
  decision: DecisionNode,
  subprocess: SubprocessNode,
  parallel: ParallelNode,
  delay: DelayNode,
} as const;

/**
 * Type-safe node types for use with React Flow
 */
export type NodeTypesMap = typeof nodeTypes;
