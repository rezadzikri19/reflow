import React, { useState } from 'react';
import { useTagColors } from '../../hooks/useTagColors';
import { useRoleColors } from '../../hooks/useRoleColors';
import {
  useFlowchartStore,
  useFilterTags,
  useFilterRoles,
  useFilterDocuments,
  useFilterData,
  useFilterSystems,
  useFilterSearchText,
  useFilterNodeTypes,
  useFilterFrequencies,
  useFilterUnitTypes,
  useFilterLocked,
  useFilterRequiresFTE,
  useFilterHasPainPoints,
  useFilterHasImprovement,
  useFilterHasRisk,
  useFilterSheets,
  useSheets,
  useHasActiveFilters,
} from '../../stores/flowchartStore';
import { useNodeFilter } from '../../hooks/useNodeFilter';
import type { TagColor } from '../../utils/tagColors';
import type { ProcessNodeType, FrequencyType, UnitType } from '../../types';

// =============================================================================
// Constants
// =============================================================================

const NODE_TYPE_LABELS: Record<ProcessNodeType, string> = {
  start: 'Start',
  end: 'End',
  process: 'Process',
  decision: 'Decision',
  subprocess: 'Subprocess',
  boundaryPort: 'Boundary Port',
  junction: 'Junction',
  reference: 'Reference',
  manualProcess: 'Manual Process',
  connector: 'Connector',
  terminator: 'Terminator',
};

const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  asNeeded: 'As Needed',
};

const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  documents: 'Documents',
  applications: 'Applications',
  cases: 'Cases',
  customers: 'Customers',
  transactions: 'Transactions',
  custom: 'Custom',
};

// =============================================================================
// Types
// =============================================================================

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  color: TagColor;
  onClick: () => void;
}

interface BooleanFilterProps {
  title: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  trueLabel?: string;
  falseLabel?: string;
}

// =============================================================================
// Icon Components
// =============================================================================

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// =============================================================================
// Sub-Components
// =============================================================================

const FilterChip: React.FC<FilterChipProps> = ({ label, isSelected, color, onClick }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
      transition-all duration-150
      ${isSelected
        ? `${color.solid} text-white shadow-sm`
        : `${color.bg} ${color.text} ${color.hover} border border-gray-200`
      }
    `}
  >
    {label}
    {isSelected && <CheckIcon />}
  </button>
);

const BooleanFilter: React.FC<BooleanFilterProps> = ({
  title,
  value,
  onChange,
  trueLabel = 'Yes',
  falseLabel = 'No',
}) => {
  const neutralColor: TagColor = {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    solid: 'bg-indigo-500',
    hover: 'hover:bg-indigo-200',
    border: 'border-indigo-500',
  };

  const trueColor: TagColor = {
    bg: 'bg-green-100',
    text: 'text-green-800',
    solid: 'bg-green-500',
    hover: 'hover:bg-green-200',
    border: 'border-green-500',
  };

  const falseColor: TagColor = {
    bg: 'bg-red-100',
    text: 'text-red-800',
    solid: 'bg-red-500',
    hover: 'hover:bg-red-200',
    border: 'border-red-500',
  };

  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="flex gap-1.5">
        <FilterChip
          label="Any"
          isSelected={value === null}
          color={neutralColor}
          onClick={() => onChange(null)}
        />
        <FilterChip
          label={trueLabel}
          isSelected={value === true}
          color={trueColor}
          onClick={() => onChange(true)}
        />
        <FilterChip
          label={falseLabel}
          isSelected={value === false}
          color={falseColor}
          onClick={() => onChange(false)}
        />
      </div>
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 pb-3 mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 hover:text-gray-800 w-full"
      >
        {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {title}
      </button>
      {isOpen && children}
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const AdvancedFilter: React.FC = () => {
  const { filterOptions } = useNodeFilter();
  const { getTagColor } = useTagColors();
  const { getRoleColor } = useRoleColors();

  // Filter state
  const filterTags = useFilterTags();
  const filterRoles = useFilterRoles();
  const filterDocuments = useFilterDocuments();
  const filterData = useFilterData();
  const filterSystems = useFilterSystems();
  const filterSearchText = useFilterSearchText();
  const filterNodeTypes = useFilterNodeTypes();
  const filterFrequencies = useFilterFrequencies();
  const filterUnitTypes = useFilterUnitTypes();
  const filterLocked = useFilterLocked();
  const filterRequiresFTE = useFilterRequiresFTE();
  const filterHasPainPoints = useFilterHasPainPoints();
  const filterHasImprovement = useFilterHasImprovement();
  const filterHasRisk = useFilterHasRisk();
  const filterSheets = useFilterSheets();
  const sheets = useSheets();
  const hasActiveFilters = useHasActiveFilters();

  // Filter actions
  const setFilterTags = useFlowchartStore((state) => state.setFilterTags);
  const setFilterRoles = useFlowchartStore((state) => state.setFilterRoles);
  const setFilterDocuments = useFlowchartStore((state) => state.setFilterDocuments);
  const setFilterData = useFlowchartStore((state) => state.setFilterData);
  const setFilterSystems = useFlowchartStore((state) => state.setFilterSystems);
  const setFilterSearchText = useFlowchartStore((state) => state.setFilterSearchText);
  const setFilterNodeTypes = useFlowchartStore((state) => state.setFilterNodeTypes);
  const setFilterFrequencies = useFlowchartStore((state) => state.setFilterFrequencies);
  const setFilterUnitTypes = useFlowchartStore((state) => state.setFilterUnitTypes);
  const setFilterLocked = useFlowchartStore((state) => state.setFilterLocked);
  const setFilterRequiresFTE = useFlowchartStore((state) => state.setFilterRequiresFTE);
  const setFilterHasPainPoints = useFlowchartStore((state) => state.setFilterHasPainPoints);
  const setFilterHasImprovement = useFlowchartStore((state) => state.setFilterHasImprovement);
  const setFilterHasRisk = useFlowchartStore((state) => state.setFilterHasRisk);
  const setFilterSheets = useFlowchartStore((state) => state.setFilterSheets);
  const clearAllFilters = useFlowchartStore((state) => state.clearAllFilters);

  // Toggle handlers for array filters
  const toggleArrayValue = <T,>(array: T[], value: T, setter: (arr: T[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter((v) => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  // Get color functions
  const getDocumentColor = (_doc: string): TagColor => ({
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    solid: 'bg-purple-500',
    hover: 'hover:bg-purple-200',
    border: 'border-purple-500',
  });

  const getDataColor = (_data: string): TagColor => ({
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    solid: 'bg-cyan-500',
    hover: 'hover:bg-cyan-200',
    border: 'border-cyan-500',
  });

  const getSystemsColor = (_system: string): TagColor => ({
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    solid: 'bg-emerald-500',
    hover: 'hover:bg-emerald-200',
    border: 'border-emerald-500',
  });

  const getNodeTypeColor = (_nodeType: string): TagColor => ({
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    solid: 'bg-blue-500',
    hover: 'hover:bg-blue-200',
    border: 'border-blue-500',
  });

  const getFrequencyColor = (_freq: string): TagColor => ({
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    solid: 'bg-amber-500',
    hover: 'hover:bg-amber-200',
    border: 'border-amber-500',
  });

  const getUnitTypeColor = (_unit: string): TagColor => ({
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    solid: 'bg-teal-500',
    hover: 'hover:bg-teal-200',
    border: 'border-teal-500',
  });

  const getSheetColor = (_sheet: string): TagColor => ({
    bg: 'bg-violet-100',
    text: 'text-violet-800',
    solid: 'bg-violet-500',
    hover: 'hover:bg-violet-200',
    border: 'border-violet-500',
  });

  // Count active filters
  const activeFilterCount =
    filterTags.length +
    filterRoles.length +
    filterDocuments.length +
    filterData.length +
    filterSystems.length +
    (filterSearchText.length > 0 ? 1 : 0) +
    filterNodeTypes.length +
    filterFrequencies.length +
    filterUnitTypes.length +
    (filterLocked !== null ? 1 : 0) +
    (filterRequiresFTE !== null ? 1 : 0) +
    (filterHasPainPoints !== null ? 1 : 0) +
    (filterHasImprovement !== null ? 1 : 0) +
    (filterHasRisk !== null ? 1 : 0) +
    filterSheets.length;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px] max-w-[380px] max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <FilterIcon />
          <h3 className="text-sm font-semibold text-gray-800">Filter Nodes</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            Clear all
            <XIcon />
          </button>
        )}
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mb-4 px-2 py-1.5 bg-primary-50 rounded text-xs text-primary-700">
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
        </div>
      )}

      {/* Text Search */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Search
        </h4>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={filterSearchText}
            onChange={(e) => setFilterSearchText(e.target.value)}
            placeholder="Search label, description, notes..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {filterSearchText && (
            <button
              onClick={() => setFilterSearchText('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>

      {/* Node Types */}
      <CollapsibleSection title="Node Type" defaultOpen={true}>
        <div className="flex flex-wrap gap-1.5">
          {filterOptions.nodeTypes.map((nodeType) => {
            const isSelected = filterNodeTypes.includes(nodeType);
            const color = getNodeTypeColor(nodeType);
            return (
              <FilterChip
                key={nodeType}
                label={NODE_TYPE_LABELS[nodeType] || nodeType}
                isSelected={isSelected}
                color={color}
                onClick={() => toggleArrayValue(filterNodeTypes, nodeType, setFilterNodeTypes)}
              />
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Sheets */}
      <CollapsibleSection title="Sheets" defaultOpen={true}>
        {sheets.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No sheets available</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sheets.map((sheet) => {
              const isSelected = filterSheets.includes(sheet.id);
              const color = getSheetColor(sheet.name);
              return (
                <FilterChip
                  key={sheet.id}
                  label={sheet.name}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterSheets, sheet.id, setFilterSheets)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Tags */}
      <CollapsibleSection title="Tags" defaultOpen={filterOptions.tags.length > 0}>
        {filterOptions.tags.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No tags in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.tags.map((tag) => {
              const isSelected = filterTags.includes(tag);
              const color = getTagColor(tag);
              return (
                <FilterChip
                  key={tag}
                  label={tag}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterTags, tag, setFilterTags)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Roles */}
      <CollapsibleSection title="Roles" defaultOpen={filterOptions.roles.length > 0}>
        {filterOptions.roles.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No roles in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.roles.map((role) => {
              const isSelected = filterRoles.includes(role);
              const color = getRoleColor(role);
              return (
                <FilterChip
                  key={role}
                  label={role}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterRoles, role, setFilterRoles)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Documents */}
      <CollapsibleSection title="Documents" defaultOpen={false}>
        {filterOptions.documents.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No documents in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.documents.map((doc) => {
              const isSelected = filterDocuments.includes(doc);
              const color = getDocumentColor(doc);
              return (
                <FilterChip
                  key={doc}
                  label={doc}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterDocuments, doc, setFilterDocuments)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Data */}
      <CollapsibleSection title="Data" defaultOpen={false}>
        {filterOptions.data.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No data elements in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.data.map((d) => {
              const isSelected = filterData.includes(d);
              const color = getDataColor(d);
              return (
                <FilterChip
                  key={d}
                  label={d}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterData, d, setFilterData)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Systems */}
      <CollapsibleSection title="Systems" defaultOpen={false}>
        {filterOptions.systems.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No systems in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.systems.map((s) => {
              const isSelected = filterSystems.includes(s);
              const color = getSystemsColor(s);
              return (
                <FilterChip
                  key={s}
                  label={s}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterSystems, s, setFilterSystems)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Systems */}
      <CollapsibleSection title="Systems" defaultOpen={false}>
        {filterOptions.systems.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No systems in flowchart</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.systems.map((s) => {
              const isSelected = filterSystems.includes(s);
              const color = getSystemsColor(s);
              return (
                <FilterChip
                  key={s}
                  label={s}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterSystems, s, setFilterSystems)}
                />
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Frequency */}
      {filterOptions.frequencies.length > 0 && (
        <CollapsibleSection title="Frequency" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.frequencies.map((freq) => {
              const isSelected = filterFrequencies.includes(freq);
              const color = getFrequencyColor(freq);
              return (
                <FilterChip
                  key={freq}
                  label={FREQUENCY_LABELS[freq] || freq}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterFrequencies, freq, setFilterFrequencies)}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Unit Type */}
      {filterOptions.unitTypes.length > 0 && (
        <CollapsibleSection title="Unit Type" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {filterOptions.unitTypes.map((unit) => {
              const isSelected = filterUnitTypes.includes(unit);
              const color = getUnitTypeColor(unit);
              return (
                <FilterChip
                  key={unit}
                  label={UNIT_TYPE_LABELS[unit] || unit}
                  isSelected={isSelected}
                  color={color}
                  onClick={() => toggleArrayValue(filterUnitTypes, unit, setFilterUnitTypes)}
                />
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Status Filters */}
      <CollapsibleSection title="Status" defaultOpen={false}>
        <BooleanFilter
          title="Locked"
          value={filterLocked}
          onChange={setFilterLocked}
          trueLabel="Locked"
          falseLabel="Unlocked"
        />
        <BooleanFilter
          title="Requires FTE"
          value={filterRequiresFTE}
          onChange={setFilterRequiresFTE}
        />
        <BooleanFilter
          title="Has Pain Points"
          value={filterHasPainPoints}
          onChange={setFilterHasPainPoints}
        />
        <BooleanFilter
          title="Has Improvement"
          value={filterHasImprovement}
          onChange={setFilterHasImprovement}
        />
        <BooleanFilter
          title="Has Risk"
          value={filterHasRisk}
          onChange={setFilterHasRisk}
        />
      </CollapsibleSection>

      {/* Filter Logic Explanation */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Nodes must match <span className="font-medium">all</span> category filters.
            Within each category, nodes match <span className="font-medium">any</span> selected value.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
