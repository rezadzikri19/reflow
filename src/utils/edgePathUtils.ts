/**
 * Edge Path Utilities
 * Utilities for calculating paths through control points
 */

import { v4 as uuidv4 } from 'uuid';
import type { EdgeControlPoint, EdgeType } from '../types';

/**
 * Generate a unique ID for a control point
 */
export function generateControlPointId(): string {
  return `cp-${uuidv4()}`;
}

/**
 * Calculate the squared distance between two points
 */
function distanceSquared(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

/**
 * Find the closest point on a path to a given point
 * Returns the index where a new control point should be inserted
 * and the position for the new control point
 */
export function findClosestPointOnPath(
  point: { x: number; y: number },
  pathPoints: { x: number; y: number }[]
): { insertIndex: number; position: { x: number; y: number } } {
  if (pathPoints.length < 2) {
    return { insertIndex: 1, position: point };
  }

  let minDistance = Infinity;
  let insertIndex = 1;
  let closestPoint = { ...point };

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const start = pathPoints[i];
    const end = pathPoints[i + 1];

    // Project point onto line segment
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) continue;

    let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projectedPoint = {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };

    const distance = distanceSquared(point, projectedPoint);

    if (distance < minDistance) {
      minDistance = distance;
      insertIndex = i + 1;
      closestPoint = projectedPoint;
    }
  }

  return { insertIndex, position: closestPoint };
}

/**
 * Insert a control point into the array, sorted by proximity to the path
 */
export function insertControlPointSorted(
  controlPoints: EdgeControlPoint[],
  newPoint: { x: number; y: number },
  source: { x: number; y: number },
  target: { x: number; y: number }
): EdgeControlPoint[] {
  // Create path points including source, existing control points, and target
  const pathPoints = [
    source,
    ...controlPoints.map(cp => ({ x: cp.x, y: cp.y })),
    target,
  ];

  const { insertIndex } = findClosestPointOnPath(newPoint, pathPoints);

  const newControlPoint: EdgeControlPoint = {
    id: generateControlPointId(),
    x: newPoint.x,
    y: newPoint.y,
  };

  const newPoints = [...controlPoints];
  newPoints.splice(insertIndex - 1, 0, newControlPoint);
  return newPoints;
}

/**
 * Get all points for path calculation (source, control points, target)
 */
export function getPathPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
  controlPoints?: EdgeControlPoint[]
): { x: number; y: number }[] {
  if (!controlPoints || controlPoints.length === 0) {
    return [source, target];
  }
  return [
    source,
    ...controlPoints.map(cp => ({ x: cp.x, y: cp.y })),
    target,
  ];
}

/**
 * Calculate a smooth bezier curve through multiple points
 * Uses cubic bezier segments between each pair of points
 */
function getMultiPointBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Calculate control points for smooth bezier curves
  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate tension control points
    const tension = 0.2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    pathParts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return pathParts.join(' ');
}

/**
 * Calculate a smoothstep path through multiple points
 * Uses right-angle corners with optional rounding
 */
function getMultiPointSmoothStepPath(
  points: { x: number; y: number }[],
  borderRadius: number = 10
): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate directions
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    // Normalize and scale for corner radius
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const r = Math.min(borderRadius, len1 / 2, len2 / 2);

    if (len1 > 0 && len2 > 0) {
      // Line to just before corner
      const lineToX = curr.x - (dx1 / len1) * r;
      const lineToY = curr.y - (dy1 / len1) * r;
      pathParts.push(`L ${lineToX} ${lineToY}`);

      // Arc around corner
      const arcToX = curr.x + (dx2 / len2) * r;
      const arcToY = curr.y + (dy2 / len2) * r;
      pathParts.push(`Q ${curr.x} ${curr.y}, ${arcToX} ${arcToY}`);
    } else {
      pathParts.push(`L ${curr.x} ${curr.y}`);
    }
  }

  // Line to final point
  const last = points[points.length - 1];
  pathParts.push(`L ${last.x} ${last.y}`);

  return pathParts.join(' ');
}

/**
 * Calculate a straight line path through multiple points (polyline)
 */
function getMultiPointStraightPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/**
 * Calculate a simple bezier path through multiple points
 * Similar to bezier but with simpler control point calculation
 */
function getMultiPointSimpleBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const pathParts: string[] = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Simple control points at midpoints
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Use offset from midpoint for curve
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.25;

    pathParts.push(`Q ${midX} ${midY - offset}, ${p2.x} ${p2.y}`);
  }

  return pathParts.join(' ');
}

/**
 * Generate an SVG path string through control points
 */
export function getPathThroughControlPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
  controlPoints: EdgeControlPoint[] | undefined,
  edgeType: EdgeType
): string {
  const points = getPathPoints(source, target, controlPoints);

  switch (edgeType) {
    case 'bezier':
      return getMultiPointBezierPath(points);
    case 'straight':
      return getMultiPointStraightPath(points);
    case 'simplebezier':
      return getMultiPointSimpleBezierPath(points);
    case 'smoothstep':
    default:
      return getMultiPointSmoothStepPath(points);
  }
}

/**
 * Calculate the midpoint of a path for label positioning
 */
export function getPathMidpoint(
  source: { x: number; y: number },
  target: { x: number; y: number },
  controlPoints?: EdgeControlPoint[]
): { x: number; y: number } {
  const points = getPathPoints(source, target, controlPoints);

  if (points.length === 2) {
    return {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
    };
  }

  // Calculate total path length and find midpoint
  let totalLength = 0;
  const segmentLengths: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const length = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(length);
    totalLength += length;
  }

  const halfLength = totalLength / 2;
  let accumulatedLength = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    if (accumulatedLength + segmentLengths[i] >= halfLength) {
      const remaining = halfLength - accumulatedLength;
      const ratio = segmentLengths[i] > 0 ? remaining / segmentLengths[i] : 0.5;
      return {
        x: points[i].x + ratio * (points[i + 1].x - points[i].x),
        y: points[i].y + ratio * (points[i + 1].y - points[i].y),
      };
    }
    accumulatedLength += segmentLengths[i];
  }

  // Fallback to geometric center
  const centerIndex = Math.floor(points.length / 2);
  return points[centerIndex];
}
