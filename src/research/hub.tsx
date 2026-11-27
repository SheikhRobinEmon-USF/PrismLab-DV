import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, Globe2, RadioTower, Thermometer, TrainFront, Zap } from "lucide-react";
import { asset } from "../assets";
import { caseHref, cases } from "./cases";
import "./research.css";

const icons = [Zap, Thermometer, RadioTower, TrainFront, Activity];

export default function ResearchHub() {
  const [featured, ...others] = cases;
  return <div className="research-site">
    <a className="research-skip" href="#case-collection">Skip to case studies</a>
    <header className="research-header">
      <div className="research-width research-header-inner">
        <Link href="/" className="research-brand"><span><Activity size={20} aria-hidden /></span>PrismLab</Link>
        <nav aria-label="Site navigation">
          <a href="#case-collection">Case studies</a>
          <Link href="/studio/">Dataset studio</Link>
        </nav>
      </div>
    </header>
    <main className="research-width research-hub">
      <section className="research-intro" aria-labelledby="research-title">
        <div className="research-intro-content">
          <p className="research-kicker"><Globe2 size={16} aria-hidden />Interactive research</p>
          <h1 id="research-title">Five questions.<br /><em>Public data.</em></h1>
          <p>Explore how the world generates power, warms, connects, travels, and moves beneath our feet. Follow the evidence from the first chart to the conclusion.</p>
          <a className="research-button primary" href="#case-collection">Explore the cases <ArrowDown size={17} aria-hidden /></a>
        </div>
        <Link href={caseHref(featured.slug)} className="research-feature" data-theme={featured.theme}
          style={{ "--cover": `url("${asset(featured.image)}")` } as React.CSSProperties}>
          <div className="research-feature-content">
            <span className="research-kicker"><Zap size={15} aria-hidden />{featured.category} · {featured.period}</span>
            <h2>{featured.name}</h2><p>{featured.question}</p>
            <span className="research-feature-stat">{featured.result}</span>
            <span className="research-feature-label">{featured.resultLabel}</span>
          </div>
          <span className="research-feature-arrow" aria-hidden><ArrowUpRight size={20} /></span>
        </Link>
      </section>
      <section id="case-collection" aria-labelledby="case-collection-title">
        <div className="research-section-head"><h2 id="case-collection-title">Case studies</h2><Link href={caseHref(featured.slug)}>Open Grid Atlas <ArrowRight size={17} aria-hidden /></Link></div>
        <div className="research-case-grid">
          {others.map((item, index) => {
            const Icon = icons[index + 1];
            return <article key={item.slug} data-theme={item.theme} className="research-tile">
              <Link href={caseHref(item.slug)}>
                <div className="research-tile-image" style={{ "--cover": `url("${asset(item.image)}")` } as React.CSSProperties}><span><Icon size={21} aria-hidden /></span></div>
                <div className="research-tile-body">
                  <div className="research-tile-meta">{item.category} <span>{item.period}</span></div>
                  <h3>{item.name}</h3><p>{item.question}</p>
                  <div className="research-tile-foot"><span>{item.source}</span><ArrowUpRight size={18} aria-hidden /></div>
                </div>
              </Link>
            </article>;
          })}
        </div>
      </section>
    </main>
    <footer className="research-width research-footer"><span>PrismLab · Interactive research portfolio</span><span>Five cases with public data and source citations</span></footer>
  </div>;
}
