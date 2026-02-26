import CustomEdge from './CustomEdge';

// All edge types use the same CustomEdge component
// which handles the different path styles internally
export const edgeTypes = {
  default: CustomEdge,
  smoothstep: CustomEdge,
  bezier: CustomEdge,
  straight: CustomEdge,
  simplebezier: CustomEdge,
};

export { CustomEdge };
