// template.tsx
import React from 'react';
import { QAValidationPosterData } from './types.js';
import {
  ClipboardCheckIcon,
  DatabaseIcon,
  LinkIcon,
  FileTextIcon,
  ShieldCheckIcon,
  RefreshIcon,
  AlertCircleIcon,
  WrenchIcon,
  SignalBarIcon,
  CheckCircleIcon,
  CalendarIcon,
  TargetIcon,
  StoreIcon,
  TrendingUpIcon,
} from './icons.js';

const LIME = '#ccff00';
const AMOLED_BLACK = '#000000';

const GLASS_CARD = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)';
const GLASS_BORDER = '1px solid rgba(255, 255, 255, 0.08)';
const GLASS_PANEL = 'rgba(255, 255, 255, 0.025)';
const GLASS_PANEL_BORDER = '1px solid rgba(255, 255, 255, 0.05)';

// --- Fully Satori-Compliant Vector Cycle Component ---
const CycleDiagram: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: '330px',
        height: '240px',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GLASS_PANEL,
        border: GLASS_PANEL_BORDER,
        borderRadius: '14px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Pure SVG Geometry (Arcs + Arrows Only) */}
      <svg
        width="330"
        height="240"
        viewBox="0 0 330 240"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Dashed Orbit Track */}
        <circle cx="165" cy="120" r="54" stroke="rgba(204, 255, 0, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />

        {/* Top-Right Arc + Arrowhead */}
        <path d="M 185 70 A 54 54 0 0 1 219 120" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="219,120 214,111 223,113" fill={LIME} />

        {/* Bottom-Right Arc + Arrowhead */}
        <path d="M 219 120 A 54 54 0 0 1 165 174" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="165,174 174,170 172,179" fill={LIME} />

        {/* Bottom-Left Arc + Arrowhead */}
        <path d="M 165 174 A 54 54 0 0 1 111 120" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="111,120 115,129 106,127" fill={LIME} />

        {/* Top-Left Arc + Arrowhead */}
        <path d="M 111 120 A 54 54 0 0 1 165 66" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="165,66 156,70 158,61" fill={LIME} />
      </svg>

      {/* 2. Central Glowing Shield Badge */}
      <div
        style={{
          display: 'flex',
          width: '50px',
          height: '50px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(204, 255, 0, 0.08)',
          border: `1.8px solid ${LIME}`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ShieldCheckIcon size={26} color={LIME} strokeWidth={2.4} />
      </div>

      {/* 3. Top Label: MONITOR */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          top: '8px',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span style={{ fontSize: '10.5px', fontWeight: 700, color: LIME, letterSpacing: '0.8px' }}>
          MONITOR
        </span>
        <span style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>
          Continuously monitor catalog health
        </span>
      </div>

      {/* 4. Bottom Label: DETECT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          bottom: '8px',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <span style={{ fontSize: '10.5px', fontWeight: 700, color: LIME, letterSpacing: '0.8px' }}>
          DETECT
        </span>
        <span style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>
          Real-time telemetry scan
        </span>
      </div>

      {/* 5. Left Label: IMPROVE */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: '10px',
          alignItems: 'center',
          width: '80px',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
          IMPROVE
        </span>
        <span style={{ fontSize: '7.5px', color: '#64748b', textAlign: 'center', lineHeight: 1.15 }}>
          Refine processes & controls
        </span>
      </div>

      {/* 6. Right Label: PREVENT */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          right: '10px',
          alignItems: 'center',
          width: '80px',
        }}
      >
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.5px' }}>
          PREVENT
        </span>
        <span style={{ fontSize: '7.5px', color: '#64748b', textAlign: 'center', lineHeight: 1.15 }}>
          Detect issues early through checks
        </span>
      </div>
    </div>
  );
};

export const QAValidationPoster: React.FC<{ data: QAValidationPosterData }> = ({ data }) => {
  const renderStepIcon = (iconName: string) => {
    switch (iconName) {
      case 'clipboard': return <ClipboardCheckIcon size={24} color={LIME} strokeWidth={2} />;
      case 'database': return <DatabaseIcon size={24} color={LIME} strokeWidth={2} />;
      case 'link': return <LinkIcon size={24} color={LIME} strokeWidth={2} />;
      case 'file': return <FileTextIcon size={24} color={LIME} strokeWidth={2} />;
      case 'shield': return <ShieldCheckIcon size={24} color={LIME} strokeWidth={2} />;
      case 'refresh': return <RefreshIcon size={24} color={LIME} strokeWidth={2} />;
      default: return <ClipboardCheckIcon size={24} color={LIME} strokeWidth={2} />;
    }
  };

  const renderMetricIcon = (iconName: string, colorTone: string) => {
    const col = colorTone === 'red' ? '#ef4444' : colorTone === 'orange' ? '#f59e0b' : LIME;
    switch (iconName) {
      case 'alert': return <AlertCircleIcon size={26} color={col} strokeWidth={2} />;
      case 'wrench': return <WrenchIcon size={26} color={col} strokeWidth={2} />;
      case 'clipboard': return <ClipboardCheckIcon size={26} color={col} strokeWidth={2} />;
      case 'signal': return <SignalBarIcon size={26} color={col} strokeWidth={2} />;
      default: return <SignalBarIcon size={26} color={col} strokeWidth={2} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1600px',
        height: '1100px',
        backgroundColor: AMOLED_BLACK,
        color: '#ffffff',
        fontFamily: 'Roboto Mono',
        padding: '24px',
        gap: '14px',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Body (Left and Right Columns) */}
      <div style={{ display: 'flex', flex: 1, gap: '14px' }}>
        
        {/* ================= LEFT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '51%', gap: '14px' }}>
          
          {/* Main Hero Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              background: GLASS_CARD,
              border: GLASS_BORDER,
              borderRadius: '16px',
              padding: '28px 32px',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            {/* Big Left-Indented Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'rgba(204, 255, 0, 0.08)',
                  border: '1px solid rgba(204, 255, 0, 0.25)',
                  color: LIME,
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  marginBottom: '10px',
                }}
              >
                {data.hero.tag}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  fontSize: '56px',
                  fontWeight: 700,
                  lineHeight: 1.02,
                  letterSpacing: '-1.5px',
                  textAlign: 'left',
                }}
              >
                <span>{data.hero.titleLine1}</span>
                <span>{data.hero.titleLine2}</span>
                <span style={{ color: LIME }}>{data.hero.titleHighlight}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 700, marginTop: '10px', letterSpacing: '0.4px', textAlign: 'left' }}>
                {data.hero.subtitle}
              </span>
            </div>

            {/* Inset Telemetry Metric Ribbon */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: GLASS_PANEL,
                  border: GLASS_PANEL_BORDER,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>VALIDATION COVERAGE</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: LIME }}>100% VERIFIED</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: GLASS_PANEL,
                  border: GLASS_PANEL_BORDER,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>RECURRENCE RISK</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>0.0% POST-FIX</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  backgroundColor: GLASS_PANEL,
                  border: GLASS_PANEL_BORDER,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>QA AUDIT STATUS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: LIME }}>GATEWAY PASS</span>
              </div>
            </div>

            {/* Centered Glass Narrative Panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: GLASS_PANEL,
                border: GLASS_PANEL_BORDER,
                borderRadius: '12px',
                padding: '14px 18px',
                gap: '8px',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.5px', textAlign: 'center' }}>
                {data.hero.pillNav.join('  •  ')}
              </div>
              <div style={{ display: 'flex', fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45, textAlign: 'center', maxWidth: '680px' }}>
                {data.hero.description}
              </div>
            </div>
          </div>

          {/* Bottom 6 Workflow Steps */}
          <div style={{ display: 'flex', gap: '8px', height: '175px' }}>
            {data.steps.map((s) => (
              <div
                key={s.number}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  background: GLASS_CARD,
                  border: GLASS_BORDER,
                  borderRadius: '12px',
                  padding: '12px 6px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(204, 255, 0, 0.06)',
                    border: '1px solid rgba(204, 255, 0, 0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {renderStepIcon(s.icon)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: LIME }}>{s.number}.</span>
                  <div
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      color: '#ffffff',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      paddingBottom: '3px',
                      width: '100%',
                      marginTop: '2px',
                    }}
                  >
                    {s.title}
                  </div>
                </div>

                <span style={{ fontSize: '9px', color: '#64748b', lineHeight: 1.25, textAlign: 'center', wordBreak: 'break-word' }}>
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '49%', gap: '14px' }}>
          
          {/* Panel 1: QA Checklist + Verified Shield */}
          <div
            style={{
              display: 'flex',
              background: GLASS_CARD,
              border: GLASS_BORDER,
              borderRadius: '16px',
              padding: '16px 20px',
              gap: '16px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.8px', marginBottom: '2px', textAlign: 'left' }}>
                {data.checklist.title}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px' }}>
                <span>CHECKPOINT</span>
                <span>STATUS</span>
              </div>
              {data.checklist.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10.5px',
                    backgroundColor: 'rgba(255, 255, 255, 0.015)',
                    padding: '3px 6px',
                    borderRadius: '4px',
                  }}
                >
                  <span style={{ color: '#cbd5e1' }}>{item.checkpoint}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: LIME, fontWeight: 700, fontSize: '9px' }}>{item.status}</span>
                    <CheckCircleIcon size={12} color={LIME} />
                  </div>
                </div>
              ))}
            </div>

            {/* Shield Passed Panel */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '140px',
                backgroundColor: GLASS_PANEL,
                border: GLASS_PANEL_BORDER,
                borderRadius: '12px',
                padding: '14px 10px',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '58px',
                  height: '58px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(204, 255, 0, 0.08)',
                  border: '1.5px solid rgba(204, 255, 0, 0.35)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                }}
              >
                <ShieldCheckIcon size={32} color={LIME} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: LIME, letterSpacing: '0.5px' }}>
                {data.checklist.badge.title}
              </span>
              <span style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '4px', lineHeight: 1.25 }}>
                {data.checklist.badge.subtitle}
              </span>
            </div>
          </div>

          {/* Panel 2: Validation Metrics */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: GLASS_CARD,
              border: GLASS_BORDER,
              borderRadius: '16px',
              padding: '14px 20px',
              gap: '8px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.8px', textAlign: 'left' }}>
              {data.metrics.title}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {data.metrics.cards.map((c, i) => {
                const isRed = c.color === 'red';
                const isOrange = c.color === 'orange';
                const accent = isRed ? '#ef4444' : isOrange ? '#f59e0b' : LIME;

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      backgroundColor: GLASS_PANEL,
                      border: GLASS_PANEL_BORDER,
                      borderRadius: '10px',
                      padding: '10px 8px',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'center',
                      height: '100px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderMetricIcon(c.icon, c.color)}
                      <span style={{ fontSize: '20px', fontWeight: 700, color: accent }}>{c.value}</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: '8px', color: '#64748b', lineHeight: 1.2 }}>
                      {c.sub}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 3: Error Prevention & Controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: GLASS_CARD,
              border: GLASS_BORDER,
              borderRadius: '16px',
              padding: '18px 20px',
              flex: 1,
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.8px', textAlign: 'left', marginBottom: '8px' }}>
              {data.prevention.title}
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '16px', alignItems: 'center' }}>
              {/* Left Side: 6 Vertically Distributed Rows */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  height: '100%',
                  justifyContent: 'space-between',
                }}
              >
                {data.prevention.bulletPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(255, 255, 255, 0.018)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      gap: '8px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <CheckCircleIcon size={13} color={LIME} />
                    <span style={{ fontSize: '10.5px', color: '#cbd5e1', lineHeight: 1.2 }}>
                      {pt}
                    </span>
                  </div>
                ))}
              </div>

              {/* Right Side: Centered Vector Cycle */}
              <CycleDiagram />
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM GLASS FOOTER ================= */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: GLASS_CARD,
          border: GLASS_BORDER,
          borderRadius: '14px',
          padding: '10px 24px',
          gap: '4px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={20} color={LIME} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>DURATION</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{data.footer.duration}</span>
            </div>
          </div>
          <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TargetIcon size={20} color={LIME} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>PROJECT SCOPE</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: LIME }}>{data.footer.scope}</span>
            </div>
          </div>
          <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <StoreIcon size={20} color={LIME} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>INDUSTRY</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: LIME }}>{data.footer.industry}</span>
            </div>
          </div>
          <div style={{ width: '1px', height: '22px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUpIcon size={20} color={LIME} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>FOCUS</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: LIME }}>{data.footer.focus}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            fontSize: '9px',
            color: '#475569',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            paddingTop: '3px',
            textAlign: 'center',
          }}
        >
          {data.footer.disclaimer}
        </div>
      </div>
    </div>
  );
};