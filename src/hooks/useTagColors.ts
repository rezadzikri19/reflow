import { useMemo } from 'react';
import { useNodes } from '../stores/flowchartStore';
import { getTagColorByIndex, assignUniqueTagColors, type TagColor } from '../utils/tagColors';

const TAG_COLOR_COUNT = 17;

/**
 * Hook to manage unique tag colors across all nodes in the flowchart
 * Ensures that each tag gets a unique color within the flowchart
 */
export function useTagColors() {
  const nodes = useNodes();

  // Get all unique tags from all nodes and assign colors
  const tagColorMap = useMemo(() => {
    const allTags = new Set<string>();

    // Collect all tags from all nodes
    for (const node of nodes) {
      const tags = node.data?.tags as string[] | undefined;
      if (tags) {
        tags.forEach(tag => allTags.add(tag));
      }
    }

    // Assign unique colors to each tag
    return assignUniqueTagColors(Array.from(allTags));
  }, [nodes]);

  /**
   * Get the color for a specific tag
   */
  const getTagColor = (tagName: string): TagColor => {
    const index = tagColorMap.get(tagName);
    if (index !== undefined) {
      return getTagColorByIndex(index);
    }
    // Fallback: assign a color based on tag name hash for new tags not yet in map
    return getTagColorByIndex(hashString(tagName) % TAG_COLOR_COUNT);
  };

  /**
   * Get all unique tags in the flowchart with their colors
   */
  const getAllTags = (): { tag: string; color: TagColor }[] => {
    return Array.from(tagColorMap.entries())
      .sort((a, b) => a[1] - b[1]) // Sort by color index for consistent ordering
      .map(([tag, index]) => ({
        tag,
        color: getTagColorByIndex(index),
      }));
  };

  return {
    getTagColor,
    getAllTags,
    tagCount: tagColorMap.size,
  };
}

/**
 * Simple hash function for fallback color assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
