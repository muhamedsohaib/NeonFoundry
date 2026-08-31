// types.ts
export interface ChecklistItem {
  icon: string;
  checkpoint: string;
  status: 'Passed' | 'Pending' | 'Failed';
}

export interface MetricCard {
  icon: 'alert' | 'wrench' | 'clipboard' | 'signal';
  value: string | number;
  label: string;
  sub: string;
  color: 'red' | 'orange' | 'lime';
}

export interface WorkflowStep {
  number: number;
  title: string;
  desc: string;
  icon: 'clipboard' | 'database' | 'link' | 'file' | 'shield' | 'refresh';
}

export interface CycleNode {
  title: string;
  desc: string;
  position: 'top' | 'right' | 'bottom' | 'left';
}

export interface QAValidationPosterData {
  hero: {
    tag: string;
    titleLine1: string;
    titleLine2: string;
    titleHighlight: string;
    subtitle: string;
    pillNav: string[];
    description: string;
  };
  checklist: {
    title: string;
    items: ChecklistItem[];
    badge: {
      title: string;
      subtitle: string;
    };
  };
  metrics: {
    title: string;
    cards: MetricCard[];
  };
  prevention: {
    title: string;
    bulletPoints: string[];
    cycle: CycleNode[];
  };
  steps: WorkflowStep[];
  footer: {
    duration: string;
    scope: string;
    industry: string;
    focus: string;
    disclaimer: string;
  };
}