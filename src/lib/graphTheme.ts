import type { GraphEdge, GraphNode } from '../types'

export const GRAPH_NODE_COLORS: Record<GraphNode['type'], string> = {
  note: '#818cf8',
  email: '#22d3ee',
  person: '#f472b6',
  tag: '#c084fc',
  calendar: '#34d399',
}

export const GRAPH_EDGE_COLORS: Record<GraphEdge['type'], string> = {
  links_to: 'rgba(129, 140, 248, 0.55)',
  references: 'rgba(34, 211, 238, 0.45)',
  tagged: 'rgba(192, 132, 252, 0.35)',
  from: 'rgba(244, 114, 182, 0.4)',
  emailed: 'rgba(244, 114, 182, 0.28)',
  attended: 'rgba(52, 211, 153, 0.4)',
}

export const GRAPH_EDGE_WIDTH: Record<GraphEdge['type'], number> = {
  links_to: 1.6,
  references: 1.4,
  tagged: 1,
  from: 1.2,
  emailed: 0.9,
  attended: 1.1,
}

export const GRAPH_TYPE_LABELS: Record<GraphNode['type'], string> = {
  note: 'Notes',
  email: 'Emails',
  person: 'People',
  tag: 'Tags',
  calendar: 'Calendar',
}

export const GRAPH_EDGE_LABELS: Record<GraphEdge['type'], string> = {
  links_to: 'Wiki links',
  references: 'References',
  tagged: 'Tagged',
  from: 'Sent by',
  emailed: 'Emailed',
  attended: 'Attended',
}

export const ALL_NODE_TYPES: GraphNode['type'][] = [
  'note',
  'email',
  'person',
  'tag',
  'calendar',
]
