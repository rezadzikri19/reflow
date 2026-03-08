/**
 * Annotation Properties Panel
 *
 * Properties panel for annotation nodes (visual elements that don't affect process logic).
 * Provides controls for fill color, stroke color, stroke width, lock, and z-index.
 */

import React, { useState, useCallback } from 'react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { AnnotationNodeData, AnnotationType, TextAlignment, TextVerticalAlignment } from '../../types';
import { Button } from '../common/Button';
import { Lock, Unlock, Trash2, BringToFront, SendToBack, AlignLeft, AlignCenter, AlignRight, Bold, Italic, ChevronUp, ChevronDown, Layers } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface AnnotationPropertiesPanelProps {
  nodeId: string;
  nodeData: AnnotationNodeData;
}

// ============================================================================
// Constants
// ============================================================================

const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  annotationRectangle: 'Rectangle',
  annotationSquare: 'Square',
  annotationCircle: 'Circle',
  annotationLine: 'Line',
  annotationTextBox: 'Text Box',
};

// Preset colors for quick selection
const PRESET_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Light Gray', value: '#f1f5f9' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Green', value: '#dcfce7' },
  { name: 'Blue', value: '#dbeafe' },
  { name: 'Purple', value: '#f3e8ff' },
  { name: 'Pink', value: '#fce7f3' },
];

const STROKE_COLORS = [
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
];

const TEXT_COLORS = [
  { name: 'Slate', value: '#334155' },
  { name: 'Gray', value: '#4b5563' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Purple', value: '#9333ea' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

// ============================================================================
// Component
// ============================================================================

export const AnnotationPropertiesPanel: React.FC<AnnotationPropertiesPanelProps> = ({
  nodeId,
  nodeData,
}) => {
  const updateAnnotationNode = useFlowchartStore((state) => state.updateAnnotationNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    annotationType,
    label = '',
    fillColor = 'transparent',
    strokeColor = '#64748b',
    strokeWidth = 2,
    hideBorder = false,
    locked = false,
    zIndex = -1,
    textAlign = 'left',
    textVerticalAlign = 'top',
    fontSize = 14,
    fontWeight = 'normal',
    fontStyle = 'normal',
    textColor = '#334155',
  } = nodeData;

  // Handle label change (for text boxes)
  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateAnnotationNode(nodeId, { label: e.target.value });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle text alignment change
  const handleTextAlignChange = useCallback(
    (alignment: TextAlignment) => {
      updateAnnotationNode(nodeId, { textAlign: alignment });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle text vertical alignment change
  const handleTextVerticalAlignChange = useCallback(
    (alignment: TextVerticalAlignment) => {
      updateAnnotationNode(nodeId, { textVerticalAlign: alignment });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle font size change
  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateAnnotationNode(nodeId, { fontSize: parseInt(e.target.value, 10) });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle font weight toggle
  const handleFontWeightToggle = useCallback(() => {
    updateAnnotationNode(nodeId, { fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' });
  }, [nodeId, fontWeight, updateAnnotationNode]);

  // Handle font style toggle
  const handleFontStyleToggle = useCallback(() => {
    updateAnnotationNode(nodeId, { fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' });
  }, [nodeId, fontStyle, updateAnnotationNode]);

  // Handle text color change
  const handleTextColorChange = useCallback(
    (color: string) => {
      updateAnnotationNode(nodeId, { textColor: color });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle fill color change
  const handleFillColorChange = useCallback(
    (color: string) => {
      updateAnnotationNode(nodeId, { fillColor: color });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle stroke color change
  const handleStrokeColorChange = useCallback(
    (color: string) => {
      updateAnnotationNode(nodeId, { strokeColor: color });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle stroke width change
  const handleStrokeWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateAnnotationNode(nodeId, { strokeWidth: parseInt(e.target.value, 10) });
    },
    [nodeId, updateAnnotationNode]
  );

  // Handle hide border toggle
  const handleHideBorderToggle = useCallback(() => {
    updateAnnotationNode(nodeId, { hideBorder: !hideBorder });
  }, [nodeId, hideBorder, updateAnnotationNode]);

  // Handle lock toggle
  const handleLockToggle = useCallback(() => {
    updateAnnotationNode(nodeId, { locked: !locked });
  }, [nodeId, locked, updateAnnotationNode]);

  // Handle bring to front
  const handleBringToFront = useCallback(() => {
    updateAnnotationNode(nodeId, { zIndex: 100 });
  }, [nodeId, updateAnnotationNode]);

  // Handle bring forward (one layer up)
  const handleBringForward = useCallback(() => {
    updateAnnotationNode(nodeId, { zIndex: Math.min(zIndex + 1, 100) });
  }, [nodeId, zIndex, updateAnnotationNode]);

  // Handle send backward (one layer down)
  const handleSendBackward = useCallback(() => {
    updateAnnotationNode(nodeId, { zIndex: Math.max(zIndex - 1, -100) });
  }, [nodeId, zIndex, updateAnnotationNode]);

  // Handle send to back
  const handleSendToBack = useCallback(() => {
    updateAnnotationNode(nodeId, { zIndex: -100 });
  }, [nodeId, updateAnnotationNode]);

  // Handle delete
  const handleDelete = useCallback(() => {
    deleteNode(nodeId);
    setShowDeleteConfirm(false);
  }, [nodeId, deleteNode]);

  return (
    <div className="h-full bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Annotation Properties</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Type: {ANNOTATION_TYPE_LABELS[annotationType]}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {ANNOTATION_TYPE_LABELS[annotationType]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Label Section (for Text Box only) */}
        {annotationType === 'annotationTextBox' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Text Content
            </h3>
            <div>
              <label
                htmlFor="annotation-label"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Label
              </label>
              <textarea
                id="annotation-label"
                value={label}
                onChange={handleLabelChange}
                rows={3}
                className="block w-full rounded-md border border-gray-300 hover:border-gray-400 bg-white px-4 py-2 text-sm placeholder-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter text..."
              />
            </div>
          </section>
        )}

        {/* Text Formatting Section (for Text Box only) */}
        {annotationType === 'annotationTextBox' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Text Formatting
            </h3>
            <div className="space-y-4">
              {/* Horizontal Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horizontal Align
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleTextAlignChange('left')}
                    className={`p-2 rounded-md transition-colors ${
                      textAlign === 'left'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTextAlignChange('center')}
                    className={`p-2 rounded-md transition-colors ${
                      textAlign === 'center'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTextAlignChange('right')}
                    className={`p-2 rounded-md transition-colors ${
                      textAlign === 'right'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Vertical Alignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vertical Align
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleTextVerticalAlignChange('top')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      textVerticalAlign === 'top'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Top
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTextVerticalAlignChange('middle')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      textVerticalAlign === 'middle'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Middle
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTextVerticalAlignChange('bottom')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      textVerticalAlign === 'bottom'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Bottom
                  </button>
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Font Size
                </label>
                <select
                  value={fontSize}
                  onChange={handleFontSizeChange}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FONT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </div>

              {/* Bold and Italic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Style
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleFontWeightToggle}
                    className={`p-2 rounded-md transition-colors ${
                      fontWeight === 'bold'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleFontStyleToggle}
                    className={`p-2 rounded-md transition-colors ${
                      fontStyle === 'italic'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Text Color
                </label>
                <div className="space-y-3">
                  {/* Color Presets */}
                  <div className="flex flex-wrap gap-2">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleTextColorChange(color.value)}
                        className={`
                          w-8 h-8 rounded-md border-2 transition-all
                          ${textColor === color.value
                            ? 'border-primary-500 ring-2 ring-primary-200'
                            : 'border-gray-300 hover:border-gray-400'
                          }
                        `}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => handleTextColorChange(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="#334155"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Fill Color Section (not for Line) */}
        {annotationType !== 'annotationLine' && (
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Fill Color
            </h3>
            <div className="space-y-3">
              {/* Color Presets */}
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleFillColorChange(color.value)}
                    className={`
                      w-8 h-8 rounded-md border-2 transition-all
                      ${fillColor === color.value
                        ? 'border-primary-500 ring-2 ring-primary-200'
                        : 'border-gray-300 hover:border-gray-400'
                      }
                      ${color.value === 'transparent'
                        ? 'bg-white'
                        : ''
                      }
                    `}
                    style={{
                      backgroundColor: color.value === 'transparent' ? undefined : color.value,
                      backgroundImage: color.value === 'transparent'
                        ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                        : undefined,
                      backgroundSize: color.value === 'transparent' ? '8px 8px' : undefined,
                      backgroundPosition: color.value === 'transparent' ? '0 0, 0 4px, 4px -4px, -4px 0px' : undefined,
                    }}
                    title={color.name}
                  />
                ))}
              </div>
              {/* Custom Color Input */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                  onChange={(e) => handleFillColorChange(e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={fillColor}
                  onChange={(e) => handleFillColorChange(e.target.value)}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </section>
        )}

        {/* Stroke Color Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Border Color
          </h3>
          <div className="space-y-3">
            {/* Color Presets */}
            <div className="flex flex-wrap gap-2">
              {STROKE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleStrokeColorChange(color.value)}
                  className={`
                    w-8 h-8 rounded-md border-2 transition-all
                    ${strokeColor === color.value
                      ? 'border-primary-500 ring-2 ring-primary-200'
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            {/* Custom Color Input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={strokeColor}
                onChange={(e) => handleStrokeColorChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="#64748b"
              />
            </div>
          </div>
        </section>

        {/* Stroke Width Section */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Border
          </h3>
          <div className="space-y-3">
            {/* Hide Border Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="hideBorder"
                checked={hideBorder}
                onChange={handleHideBorderToggle}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label
                htmlFor="hideBorder"
                className="ml-2 block text-sm text-gray-700"
              >
                No Border
              </label>
            </div>

            {/* Border Width Slider (disabled when hideBorder is true) */}
            {!hideBorder && (
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={strokeWidth}
                  onChange={handleStrokeWidthChange}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 w-12 text-right">
                  {strokeWidth}px
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Layer Controls */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Layer Order
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBringToFront}
              className="flex items-center justify-center"
              title="Bring to Front"
            >
              <BringToFront className="w-4 h-4 mr-1" />
              Front
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendToBack}
              className="flex items-center justify-center"
              title="Send to Back"
            >
              <SendToBack className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBringForward}
              disabled={zIndex >= 100}
              className="flex items-center justify-center"
              title="Bring Forward One Layer"
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              Forward
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSendBackward}
              disabled={zIndex <= -100}
              className="flex items-center justify-center"
              title="Send Backward One Layer"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Backward
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">
              Layer: {zIndex}
            </p>
            <p className="text-xs text-gray-400">
              {zIndex < 0 ? 'Behind nodes' : zIndex === 0 ? 'Same as nodes' : 'In front of nodes'}
            </p>
          </div>
        </section>

        {/* Action Buttons */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Actions
          </h3>
          <div className="space-y-3">
            {/* Lock Button */}
            <Button
              variant={locked ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleLockToggle}
              fullWidth
            >
              {locked ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Lock
                </>
              )}
            </Button>

            {/* Delete Button */}
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">Delete this annotation?</p>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                fullWidth
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Annotation
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AnnotationPropertiesPanel;
