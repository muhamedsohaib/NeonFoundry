import { Fragment, createElement, isValidElement, type ReactNode } from 'react';
import type { SatoriNode } from 'satori';

export interface GeometryNode {
  id: string;
  parent?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  text?: string;
  region?: string;
  sectionId?: string;
}

/** Resolve our pure render components so every measured element has a parent. */
export function instrument(element: ReactNode) {
  let nextId = 0;
  const parents = new Map<string, string | undefined>();
  const nodes: GeometryNode[] = [];
  function visit(node: ReactNode, parent?: string): ReactNode {
    if (Array.isArray(node)) return node.map((child) => visit(child, parent));
    if (!isValidElement<Record<string, unknown>>(node)) return node;
    if (node.type === Fragment) return visit(node.props.children as ReactNode, parent);
    if (typeof node.type === 'function') {
      return visit((node.type as (props: Record<string, unknown>) => ReactNode)(node.props), parent);
    }
    const id = String(nextId++);
    parents.set(id, parent);
    const children = node.type === 'svg' ? node.props.children : visit(node.props.children as ReactNode, id);
    return createElement(node.type, { ...node.props, key: id, 'data-measure-id': id }, children as ReactNode);
  }
  return {
    element: visit(element),
    nodes,
    onNodeDetected(node: SatoriNode) {
      const id = node.props['data-measure-id'] as string | undefined;
      if (id === undefined) return;
      nodes.push({ id, parent: parents.get(id), left: node.left, top: node.top,
        width: node.width, height: node.height, text: node.textContent ?? (
          Array.isArray(node.props.children) && node.props.children.every((child: unknown) => typeof child === 'string' || typeof child === 'number')
            ? node.props.children.join('') : undefined),
        region: node.props['data-region'], sectionId: node.props['data-section'] });
    },
  };
}

export function layoutOverflows(nodes: GeometryNode[], width: number, height: number): string[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const issues: string[] = [];
  const tolerance = 1;
  for (const node of nodes) {
    const parent = node.parent ? byId.get(node.parent) : undefined;
    const label = node.text?.slice(0, 80) || node.sectionId || node.region || `element ${node.id}`;
    const right = node.left + node.width;
    const bottom = node.top + node.height;
    if (node.left < -tolerance || node.top < -tolerance || right > width + tolerance || bottom > height + tolerance) {
      issues.push(`Canvas overflow: ${label} (${Math.round(right)} × ${Math.round(bottom)}).`);
    }
    if (parent && node.width > tolerance && node.height > tolerance
      && parent.width > tolerance && parent.height > tolerance
      && (node.left < parent.left - tolerance || node.top < parent.top - tolerance
      || right > parent.left + parent.width + tolerance || bottom > parent.top + parent.height + tolerance)) {
      issues.push(`Content does not fit its container: ${label} [${Math.round(node.left)},${Math.round(node.top)},${Math.round(node.width)},${Math.round(node.height)}] in parent [${Math.round(parent.left)},${Math.round(parent.top)},${Math.round(parent.width)},${Math.round(parent.height)}].`);
    }
  }
  return issues;
}
