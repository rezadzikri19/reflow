import type { FlowchartNode, ProcessNodeData } from '../types';

export interface TreeNode {
  node: FlowchartNode;
  children: TreeNode[];
  depth: number;
}

// Type guard to check if node has ProcessNodeData
function hasProcessNodeData(node: FlowchartNode): node is FlowchartNode & { data: ProcessNodeData } {
  return node.type !== 'boundaryPort';
}

// Helper to safely get parentId
function getParentId(node: FlowchartNode): string | undefined {
  if (hasProcessNodeData(node)) {
    return node.data.parentId;
  }
  return undefined;
}

/**
 * Get child node IDs for a subprocess by computing from parentId relationships
 * This is the single source of truth - childNodeIds array is no longer maintained
 */
export function getChildNodeIds(subprocessId: string, nodes: FlowchartNode[]): string[] {
  return nodes
    .filter(n => getParentId(n) === subprocessId)
    .map(n => n.id);
}

// Helper to safely get label
function getNodeLabel(node: FlowchartNode): string {
  if (hasProcessNodeData(node)) {
    return node.data.label || '';
  }
  return '';
}

/**
 * Get all root nodes (nodes without a parentId)
 */
export function getRootNodes(nodes: FlowchartNode[]): FlowchartNode[] {
  return nodes.filter(node => !getParentId(node));
}

/**
 * Get direct child nodes of a parent
 */
export function getChildNodes(parentId: string, nodes: FlowchartNode[]): FlowchartNode[] {
  return nodes.filter(node => getParentId(node) === parentId);
}

/**
 * Get the parent chain from a node to the root
 * Returns array from immediate parent to root (not including the node itself)
 */
export function getParentChain(nodeId: string, nodes: FlowchartNode[]): FlowchartNode[] {
  const chain: FlowchartNode[] = [];
  const visited = new Set<string>();
  let currentNode = nodes.find(n => n.id === nodeId);

  while (currentNode) {
    const parentId = getParentId(currentNode);
    if (!parentId) break;

    if (visited.has(currentNode.id)) {
      console.warn('Circular reference detected in parent chain');
      break;
    }
    visited.add(currentNode.id);

    const parent = nodes.find(n => n.id === parentId);
    if (parent) {
      chain.push(parent);
      currentNode = parent;
    } else {
      // Orphaned node - parent doesn't exist
      break;
    }
  }

  return chain;
}

/**
 * Build a tree structure from flat node list
 * Returns array of root TreeNodes with nested children
 */
export function buildNodeTree(nodes: FlowchartNode[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: create TreeNode for each node
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      node,
      children: [],
      depth: 0,
    });
  });

  // Second pass: build parent-child relationships
  nodes.forEach(node => {
    const treeNode = nodeMap.get(node.id)!;
    const parentId = getParentId(node);

    if (parentId && nodeMap.has(parentId)) {
      const parentTreeNode = nodeMap.get(parentId)!;
      parentTreeNode.children.push(treeNode);
    } else {
      rootNodes.push(treeNode);
    }
  });

  // Sort children by their position in the original childNodeIds array
  // or by label if no childNodeIds exist
  // Note: childNodeIds is now computed from parentId, so we pass the full nodes array
  nodeMap.forEach(treeNode => {
    const childNodeIds = getChildNodeIds(treeNode.node.id, nodes);
    if (childNodeIds.length > 0) {
      // Sort by the order in childNodeIds
      treeNode.children.sort((a, b) => {
        const indexA = childNodeIds.indexOf(a.node.id);
        const indexB = childNodeIds.indexOf(b.node.id);
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return getNodeLabel(a.node).localeCompare(getNodeLabel(b.node));
      });
    } else {
      // Sort by label
      treeNode.children.sort((a, b) =>
        getNodeLabel(a.node).localeCompare(getNodeLabel(b.node))
      );
    }
  });

  // Sort root nodes by label
  rootNodes.sort((a, b) =>
    getNodeLabel(a.node).localeCompare(getNodeLabel(b.node))
  );

  return rootNodes;
}

/**
 * Flatten tree to array with depth info, respecting expanded state
 * Only includes nodes that should be visible based on expanded subprocesses
 */
export function flattenTreeWithDepth(
  tree: TreeNode[],
  expandedIds: Set<string>
): Array<{ node: FlowchartNode; depth: number }> {
  const result: Array<{ node: FlowchartNode; depth: number }> = [];

  function traverse(treeNodes: TreeNode[], currentDepth: number) {
    treeNodes.forEach(treeNode => {
      result.push({
        node: treeNode.node,
        depth: currentDepth,
      });

      // Only show children if this is a subprocess and it's expanded
      const nodeType = treeNode.node.type;
      const isSubprocess = nodeType === 'subprocess';
      const isExpanded = expandedIds.has(treeNode.node.id);

      if (isSubprocess && isExpanded && treeNode.children.length > 0) {
        traverse(treeNode.children, currentDepth + 1);
      }
    });
  }

  traverse(tree, 0);
  return result;
}

/**
 * Filter tree to only include nodes matching a predicate and their ancestors
 */
export function filterTreeWithAncestors(
  nodes: FlowchartNode[],
  matchingIds: Set<string>
): Set<string> {
  const visibleIds = new Set<string>(matchingIds);

  // Add all ancestors of matching nodes
  matchingIds.forEach(id => {
    const ancestors = getParentChain(id, nodes);
    ancestors.forEach(ancestor => visibleIds.add(ancestor.id));
  });

  return visibleIds;
}

/**
 * Sort tree nodes while preserving hierarchy
 * Sorts children within each parent group
 */
export function sortTreeNodes(
  tree: TreeNode[],
  sortColumn: string | null,
  sortDirection: 'asc' | 'desc',
  flowOrderMap?: Map<string, string>
): TreeNode[] {
  if (!sortColumn) return tree;

  const getValue = (node: FlowchartNode): string | number => {
    if (!hasProcessNodeData(node)) return '';

    const data = node.data;
    switch (sortColumn) {
      case 'label':
        return data.label || '';
      case 'nodeType':
        return node.type || '';
      case 'description':
        return data.description || '';
      case 'role':
        // Handle backward compatibility: role could be string or string[]
        const rawRole = data.role;
        const roles: string[] = Array.isArray(rawRole)
          ? rawRole
          : rawRole
            ? [rawRole]
            : [];
        return roles.join(', ');
      case 'tags':
        return (data.tags || []).join(', ');
      case 'documents':
        return (data.documents || []).join(', ');
      case 'unitTimeMinutes':
        return data.unitTimeMinutes || 0;
      case 'frequency':
        return data.frequency || '';
      case 'sheet':
        return (node as any).sheetName || '';
      case 'flowOrder':
        // Use hierarchical flow order (e.g., "2.3.5") for sorting
        return flowOrderMap?.get(node.id) || '';
      default:
        return '';
    }
  };

  const compare = (a: TreeNode, b: TreeNode): number => {
    const valueA = getValue(a.node);
    const valueB = getValue(b.node);

    let result: number;
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      result = valueA - valueB;
    } else {
      result = String(valueA).localeCompare(String(valueB), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    }

    return sortDirection === 'asc' ? result : -result;
  };

  // Deep clone and sort
  const sortRecursive = (treeNodes: TreeNode[]): TreeNode[] => {
    return treeNodes
      .map(treeNode => ({
        ...treeNode,
        children: sortRecursive([...treeNode.children]),
      }))
      .sort(compare);
  };

  return sortRecursive([...tree]);
}

/**
 * Get all descendant node IDs of a subprocess
 */
export function getDescendantIds(nodeId: string, nodes: FlowchartNode[]): string[] {
  const descendants: string[] = [];
  const visited = new Set<string>();

  function collectChildren(parentId: string) {
    if (visited.has(parentId)) return;
    visited.add(parentId);

    const children = getChildNodes(parentId, nodes);
    children.forEach(child => {
      descendants.push(child.id);
      // Recursively collect if this child is also a subprocess
      if (child.type === 'subprocess') {
        collectChildren(child.id);
      }
    });
  }

  collectChildren(nodeId);
  return descendants;
}

/**
 * Flatten tree to array with depth info, including ALL nodes regardless of expansion state
 * Use this for exports where you want the complete hierarchy
 */
export function flattenTreeAllNodes(
  tree: TreeNode[]
): Array<{ node: FlowchartNode; depth: number }> {
  const result: Array<{ node: FlowchartNode; depth: number }> = [];

  function traverse(treeNodes: TreeNode[], currentDepth: number) {
    treeNodes.forEach(treeNode => {
      result.push({
        node: treeNode.node,
        depth: currentDepth,
      });

      // Always include children for subprocesses (unlike flattenTreeWithDepth)
      if (treeNode.node.type === 'subprocess' && treeNode.children.length > 0) {
        traverse(treeNode.children, currentDepth + 1);
      }
    });
  }

  traverse(tree, 0);
  return result;
}

/**
 * Get breadcrumb path for a node (from root to parent)
 * Returns a string like "Subprocess A > Subprocess B" or empty string if at root level
 */
export function getBreadcrumbPath(nodeId: string, nodes: FlowchartNode[]): string {
  const parentChain = getParentChain(nodeId, nodes);

  if (parentChain.length === 0) {
    return '';
  }

  // Reverse to get root first, then filter to only subprocesses and get labels
  const breadcrumbs = parentChain
    .reverse()
    .map(node => getNodeLabel(node));

  return breadcrumbs.join(' > ');
}
