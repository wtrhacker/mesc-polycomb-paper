/* Local HTML: observations are source-backed records, not inferred mechanisms. */
(() => {
  'use strict';
  const data = window.GEMS || {observations:[],papers:[],references:[],comparisons:[]};
  const observations = Array.isArray(data.observations) ? data.observations : [];
  const corePapers = Array.isArray(data.papers) ? data.papers : [];
  const contextPapers = Array.isArray(data.context_papers) ? data.context_papers : [];
  const interactionContextPapers = Array.isArray(data.interaction_context_papers) ? data.interaction_context_papers : [];
  const papers = [...corePapers,...contextPapers,...interactionContextPapers];
  const state = {view:'chromatin',subunit:'all',query:'',readout:'all',importance:'all',selected:new Set()};
  const $ = id => document.getElementById(id);
  const text = v => v == null ? '' : typeof v==='string' ? v : Array.isArray(v) ? v.map(text).join('; ') : typeof v==='object' ? Object.values(v).map(text).join(' · ') : String(v);
  const list = v => Array.isArray(v) ? v : v ? [v] : [];
  const esc = v => text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const url = value => {const v=text(value);return /^(https?:\/\/|[^:/?#]+(?:\/[^:]*)?|\.\.?\/)/i.test(v)&&!/^\s*(javascript|data|vbscript):/i.test(v)?esc(v):'#';};
  const link = (href,label,cls='') => href?`<a href="${url(href)}" target="_blank" rel="noopener"${cls?` class="${cls}"`:''}>${esc(label)}</a>`:'';
  const sourceUrl = v => typeof v==='string'?v:v?.url||v?.source_url||v?.source||'';
  const byId = id => observations.find(o=>String(o.id)===String(id));
  const paper = o => papers.find(p=>p.id===o.paper_id)||{};
  const citation = o => {const p=paper(o);return p.citation||(text(p.authors).split(/[;,]/)[0]||p.id||'Source').replace(/^.*?\b([A-Z][a-z]+)$/, '$1');};
  const isInteraction = o => o.record_kind==='interaction'||o.presentation==='summary_no_panels';
  const membership = o => list(o.indexed_components).length?o.indexed_components:list(o.perturbed_subunits);
  const interactionData = o => o.interaction||{};
  const mainPanels = o => {if(isInteraction(o))return [];const ps=list(o.panels).filter(p=>p&&p.path);if(o.modality==='rna')return ps;const specific=ps.filter(p=>!p.view||/chromatin|protein|binding/i.test(p.view));return specific.length?specific:ps;};
  const rnaPanels = o => list(o.rna?.panels).filter(p=>p&&p.path);
  const hasRna = o => o.rna?.measured===true && Boolean(o.rna?.result);
  const pairedRna = o => hasRna(o) && o.rna?.chromatin_pairing?.status==='matched';
  const pairingPanels = o => list(o.rna?.chromatin_pairing?.panels).length?o.rna.chromatin_pairing.panels:mainPanels(o);
  const conditionFor = (o,assay) => assay==='rna'&&o.rna?.conditions?{...o,...o.rna.conditions}:o;
  const pairingLink = o => pairedRna(o)?detailButton(o.id,'Matched chromatin ↗','chromatin','text-button','pairing'):o.rna?.chromatin_pairing?.status==='partial'?(pairingPanels(o)[0]?link(pairingPanels(o)[0].path,o.rna.chromatin_pairing.link_label||'Related chromatin panel ↗'):'<span class="minor">Pairing is restricted; see details</span>'):'<span class="minor">Different chromatin condition</span>';
  const main = observations.filter(o=>o.include_in_main!==false);
  const chromatin = main.filter(o=>o.modality!=='rna');
  const context = observations.filter(o=>o.category==='2i');
  const referenceInteractions = observations.filter(o=>isInteraction(o)&&o.include_in_main===false&&o.category!=='2i');
  const rnaRows = () => {const seen=new Set();return main.filter(o=>{if(!hasRna(o))return false;const k=o.experiment_id+'|'+o.rna.result;if(seen.has(k))return false;seen.add(k);return true;});};
  const baseRows = () => state.view==='2i'?context:state.view==='rna'?rnaRows():chromatin;
  const readouts = o => state.view==='rna' ? list(o.rna?.assay_families).length?o.rna.assay_families:[o.rna?.assay_family].filter(Boolean) : list(o.readout_families).length?o.readout_families:list(o.readout?.split(/;|\//).map(s=>s.trim()));
  const brief = v => text(v);
  const scope = o => o.scope_detail || o.scope || '';
  const matchedLabel = o => {if(pairedRna(o))return 'RNA ↗';if(hasRna(o))return 'RNA · pairing limits ↗';const s=o.rna?.status||'';return /not_reported|not_measured|none_identified/.test(s)?'No matched RNA reported':'RNA matching not yet checked';};
  const rowReadout = o => state.view==='rna' ? o.rna.assay : o.readout;
  const rowResult = o => state.view==='rna' ? o.rna.result : o.result;
  const rowPanels = o => state.view==='rna'?rnaPanels(o):mainPanels(o);
  const detailButton = (id,label,assay='chromatin',cls='text-button',focus='condition') => `<button class="${cls}" type="button" data-detail="${esc(id)}" data-assay="${esc(assay)}" data-focus="${esc(focus)}">${esc(label)}</button>`;
  const wholeCardButton=(id,label,assay='chromatin',cls='text-button')=>`<button class="${cls}" type="button" data-card-detail="${esc(cardLeadId(id)||id)}" data-assay="${esc(assay)}">${esc(label)}</button>`;
  const compareCheckbox = o => `<label class="compare-label"><input type="checkbox" data-select="${esc(o.id)}"${state.selected.has(o.id)?' checked':''} aria-label="Compare ${esc(o.intervention_plain)}">Compare</label>`;
  const compactFor=(o,assay='chromatin')=>{
    const x=o.compact||{},rna=assay==='rna';
    return {
      perturbation:rna?(x.rna_perturbation||x.perturbation||conditionFor(o,assay).intervention_plain):(x.perturbation||o.intervention_plain),
      timing:rna&&Object.prototype.hasOwnProperty.call(x,'rna_timing')?x.rna_timing:(x.timing||''),
      function:rna&&o.rna?.conditions?(x.rna_function||''):(x.function||''),
      result:rna?(x.rna_result||o.rna?.result):(x.result||o.result),
      scope:rna?(x.rna_scope||''):(x.scope||'')
    };
  };
  const paperCitation=p=>p.display_citation||[p.citation||p.authors,p.year,p.journal].filter(Boolean).join(' · ');
  const paperTitleShort=p=>{const words=text(p.title).split(/\s+/);return words.slice(0,7).join(' ')+(words.length>7?'…':'');};
  function paperIdentity(o,full=false){
    const p=paper(o);return `<div class="paper-identity"><span class="paper-citation">${esc(paperCitation(p))}</span>${full?`<p class="detail-subtitle">${esc(p.title)}</p>`:`<a class="paper-title-short" href="${url(p.pdf_path||p.url)}" title="${esc(p.title)}" target="_blank" rel="noopener">${esc(paperTitleShort(p))} ↗</a>`}</div>`;
  }
  function comparisonNotes(o){
    const links=list(o.comparison_links).filter(c=>byId(c.observation_id));
    if(links.length)return `<section class="detail-section comparison-notes"><h3>Comparison</h3>${links.map(c=>{const other=byId(c.observation_id);return `<p><a href="#observation=${encodeURIComponent(other.id)}" class="observation-reference">${esc(paperCitation(paper(other)))}</a> — ${esc(c.text)}</p>`;}).join('')}</section>`;
    return '';
  }
  function experimentalDetails(o,assay='chromatin'){
    const c=conditionFor(o,assay),x=compactFor(o,assay);
    return `<details class="details-fold experimental-details"><summary>Experimental details</summary><dl class="method-facts">${c.intervention_exact?`<dt>Design</dt><dd>${esc(c.intervention_exact)}</dd>`:''}${x.timing&&c.duration?`<dt>Timing</dt><dd>${esc(c.duration)}</dd>`:''}${c.system?`<dt>Cells / construct</dt><dd>${esc(c.system)}${c.culture?.detail?`<br>${esc(c.culture.detail)}`:''}</dd>`:''}${c.control?`<dt>Control</dt><dd>${esc(c.control)}</dd>`:''}${Object.keys(c.perturbation_roles||{}).length?`<dt>Components</dt><dd>${Object.entries(c.perturbation_roles).map(([g,v])=>`${esc(g)}: ${esc(v)}`).join('; ')}</dd>`:''}${c.function_changed?`<dt>Function</dt><dd>${esc(c.function_changed)}</dd>`:''}${o.assay?`<dt>Assay</dt><dd>${esc(assay==='rna'?o.rna.assay:o.assay)}</dd>`:''}</dl>${list(o.limitations).length?`<ul>${o.limitations.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}${o.sources?`<div class="detail-links">${list(o.sources).map((v,i)=>link(sourceUrl(v),v.label||`Source ${i+1}`)).join('')}</div>`:''}${list(o.curator_note).length?`<div class="curator-detail"><h4>Curator note</h4>${interpretation(o.curator_note)}</div>`:''}${o.why_useful?`<details><summary>Why included</summary><p>${esc(o.why_useful)}</p></details>`:''}</details>`;
  }
  const presentation=o=>o.presentation&&typeof o.presentation==='object'?o.presentation:{};
  const displayRecords=observations.filter(o=>o.include_in_main!==false||o.category==='2i'||isInteraction(o));
  const cardKey=o=>presentation(o).merge_group?`${o.paper_id}|${o.category||'serum_no_2i'}|${presentation(o).merge_group}`:`record:${o.id}`;
  const cardMembership=c=>[...new Set(c.members.flatMap(membership))];
  function cardsFor(rows){
    const keys=[...new Set(rows.map(cardKey))];
    return keys.map(key=>{const members=displayRecords.filter(o=>cardKey(o)===key).sort((a,b)=>(presentation(a).merge_order??0)-(presentation(b).merge_order??0));const lead=members[0];return {id:lead.id,key,members,lead};});
  }
  const cardForId=id=>{const o=byId(id);return o?cardsFor([o])[0]:null;};
  const cardLeadId=id=>cardForId(id)?.id;
  const cardRecords=cards=>[...new Map(cards.flatMap(c=>c.members).map(o=>[o.id,o])).values()];
  const cardRepresentative=c=>state.view==='rna'?(c.members.find(hasRna)||c.lead):c.lead;
  const defaultFamilies=[
    {id:'prc1-shared',label:'PRC1 shared',components:['RING1A','RING1B']},
    {id:'prc2-shared',label:'PRC2 shared',components:['EZH2','EED','SUZ12']},
    {id:'vprc1',label:'vPRC1',components:['RYBP','YAF2','PCGF1','PCGF3','PCGF5','PCGF6','KDM2B']},
    {id:'cprc1',label:'cPRC1',components:['PCGF2','PCGF4','CBX2','CBX7','PHC1']},
    {id:'prc21',label:'PRC2.1',components:['MTF2','PHF1','PHF19','PALI1','PALI2','EPOP']},
    {id:'prc22',label:'PRC2.2',components:['JARID2','AEBP2']}
  ];
  const families=list(data.family_groups).length?data.family_groups:defaultFamilies;
  const familyComponents=f=>list(f.components||f.subunits);
  const familyFor=g=>families.find(f=>familyComponents(f).includes(g));
  function cardReadouts(card,assay=state.view){
    const rows=[];
    for(const o of card.members){
      const x=compactFor(o,assay),p=presentation(o);
      if(assay==='rna'){
        if(hasRna(o))rows.push({label:'RNA',text:x.result,kind:'rna',observation_id:o.id,result_id:'rna',hierarchy_scope:p.rna_hierarchy_scope||''});
        continue;
      }
      if(list(p.readouts).length){
        for(const [i,r] of p.readouts.entries()){if(r.kind==='rna'&&p.rna_inline===false)continue;rows.push({...r,observation_id:r.observation_id||o.id,result_id:'r'+i});}
      }else if(!isInteraction(o))rows.push({label:'',text:x.result,kind:'observation',observation_id:o.id});
    }
    const order=readoutOrderFor(card),seen=new Set();return rows.filter(r=>{const k=(r.kind||'')+'|'+r.label+'|'+r.text;if(!r.text||seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>(order[readoutGroup(a)]??10)-(order[readoutGroup(b)]??10));
  }
  const readoutGroup=r=>r.display_group||(r.kind==='rna'?'rna':['marks','mark','histone_marks'].includes(r.kind)?'marks':['other_protein','other_proteins','other_binding','protein_response'].includes(r.kind)?'other':r.kind==='interaction'?'interaction':'own');
  const readoutGroupOrder={marks:0,chemistry:1,own:2,other:3,structure:4,interaction:4,rna:5};
  const readoutOrderFor=card=>{const order=card.members.map(o=>presentation(o).readout_group_order).find(Array.isArray);return order?Object.fromEntries(order.map((g,i)=>[g,i])):readoutGroupOrder;};
  const readoutGroupLabels={own:'Proteins',structure:'Chromatin structure',interaction:'Interactions',chemistry:'Enzyme activity',marks:'Histone marks',other:'Other proteins',rna:'RNA'};
  function readoutLine(r,grouped=false){
    const label=grouped&&r.display_label!==undefined?r.display_label:r.label;
    return `<div class="readout-line${label?'':' no-readout-label'}" data-readout-kind="${esc(r.kind||'observation')}">${label?`<b>${esc(label)}</b>`:''}<a class="readout-evidence" title="View this result and its panels" href="#observation=${encodeURIComponent(r.observation_id)}&assay=${r.kind==='rna'?'rna':'chromatin'}&focus=evidence${r.result_id?'&result='+encodeURIComponent(r.result_id):''}">${esc(r.text)}</a></div>`;
  }
  function readoutScopeRows(rows,grouped){
    const general=rows.filter(r=>!r.hierarchy_scope),scopes=[...new Set(rows.map(r=>r.hierarchy_scope).filter(Boolean))];
    return general.map(r=>readoutLine(r,grouped)).join('')+scopes.map(scope=>`<div class="readout-subset"><p class="readout-scope-label">${esc(scope)}</p>${rows.filter(r=>r.hierarchy_scope===scope).map(r=>readoutLine(r,true)).join('')}</div>`).join('');
  }
  function renderReadouts(card,assay=state.view){
    const rows=cardReadouts(card,assay);if(!rows.length)return '';
    const groups=[...new Set(rows.map(readoutGroup))];
    const grouped=rows.length>=4&&groups.length>1&&groups.some(g=>rows.filter(r=>readoutGroup(r)===g).length>1);
    if(!grouped)return `<div class="readout-lines">${readoutScopeRows(rows,false)}</div>`;
    return `<div class="readout-groups">${groups.map(g=>{
      const members=rows.filter(r=>readoutGroup(r)===g);
      const explicit=members.map(r=>presentation(byId(r.observation_id)||{}).readout_group_labels?.[g]).find(Boolean);
      const modalities=[...new Set(members.map(r=>r.display_modality||''))];
      const split=modalities.length>1&&modalities.every(Boolean);
      const content=split?modalities.map(modality=>`<div class="readout-modality"><p class="readout-modality-label">${esc(modality)}</p>${readoutScopeRows(members.filter(r=>r.display_modality===modality),true)}</div>`).join(''):readoutScopeRows(members,true);
      return `<section class="readout-group readout-group-${g}" data-readout-group="${g}"><h4 class="readout-group-title">${esc(explicit||readoutGroupLabels[g])}</h4><div class="readout-group-body">${content}</div></section>`;
    }).join('')}</div>`;
  }
  function cardSources(card){
    if(card.members.length<2)return '';
    return `<details class="card-sources"><summary>All observations</summary>${card.members.map(o=>`<a href="#observation=${encodeURIComponent(o.id)}">${esc(o.phenotype_label||o.readout||compactFor(o).result)}</a>`).join('')}</details>`;
  }
  function renderPerturbationCard(card,supporting=false){
    const o=cardRepresentative(card),x=compactFor(o,state.view),numeric=state.view!=='rna'?card.members.filter(isInteraction):[];
    const functions=[...new Set(card.members.map(m=>compactFor(m,state.view).function).filter(Boolean))];
    const timing=[...new Set(card.members.map(m=>compactFor(m,state.view).timing).filter(Boolean))];
    const rna=card.members.filter(hasRna),inline=cardReadouts(card,state.view).some(r=>r.kind==='rna');
    const rnaLinks=state.view==='rna'||inline?'':rna.length?`<div class="rna-link">${[...new Map(rna.map(m=>[m.rna.result,m])).values()].map(m=>detailButton(m.id,pairedRna(m)?'RNA ↗':m.rna.chromatin_pairing?.status==='partial'?'RNA · partial match ↗':'RNA · other condition ↗','rna','text-button','evidence')).join(' ')}</div>`:'';
    const contexts=[...new Set(card.members.map(m=>presentation(m).complex_context).filter(Boolean))];
    return `<article class="perturbation-card${numeric.length?' has-metrics':''}${supporting?' supporting-interaction':''}" id="${esc(card.id)}" data-card="${esc(card.id)}" data-member-ids="${esc(card.members.map(m=>m.id).join(' '))}"><div class="perturbation-identity">${paperIdentity(o)}${wholeCardButton(o.id,x.perturbation,state.view,'intervention-title')}${o.include_in_main===false?cultureBadge(o):''}${contexts.map(v=>`<span class="complex-context">${esc(v)}</span>`).join('')}${functions.map(v=>`<p class="function-note">${esc(v)}</p>`).join('')}${timing.length?`<span class="timing">${esc(timing.join(' · '))}</span>`:''}<div class="card-actions">${wholeCardButton(o.id,'All results',state.view)}${compareCheckbox({...o,id:card.id})}</div>${cardSources(card)}</div><div class="perturbation-readouts">${renderReadouts(card)}${numeric.map(m=>`<div class="numeric-readout"><p class="metric-subject"><b>Measured:</b> ${esc(measuredSubjects(m))}</p>${metricTable(metricRows(m,true))}${interactionData(m).metric_note?`<details class="metric-definition"><summary>Definitions</summary>${metricNotes(metricRows(m,true),interactionData(m).metric_note)}</details>`:''}</div>`).join('')}${x.scope?`<p class="scope-note">${esc(x.scope)}</p>`:''}${rnaLinks}</div></article>`;
  }
  function otherFilters(o){return (state.readout==='all'||readouts(o).includes(state.readout))&&(state.importance==='all'||o.importance==='key')&&(!state.query||text([o,paper(o)]).toLowerCase().includes(state.query));}
  function pass(o){return (state.subunit==='all'||membership(o).includes(state.subunit))&&otherFilters(o);}
  function visibleRows(){return baseRows().filter(pass);}
  function visibleReferenceInteractions(){return state.view==='chromatin'?referenceInteractions.filter(pass):[];}
  function navigationRows(){return state.view==='chromatin'?[...baseRows(),...referenceInteractions]:baseRows();}
  function renderNavigation(){
    const core=cardsFor(baseRows().filter(otherFilters)),refs=state.view==='chromatin'?cardsFor(referenceInteractions.filter(otherFilters)):[];
    const available=[...new Set([...list(data.subunits),...[...core,...refs].flatMap(cardMembership)])];
    const renderButton=g=>{const count=g==='all'?core.length:core.filter(c=>cardMembership(c).includes(g)).length;const extra=g==='all'?refs.length:refs.filter(c=>cardMembership(c).includes(g)).length;if(g!=='all'&&!count&&!extra&&state.subunit!==g)return '';return `<button type="button" class="subunit-button${state.subunit===g?' active':''}" data-subunit="${esc(g)}" aria-pressed="${state.subunit===g}" title="${count} related cards${extra?`; ${extra} supporting-context cards`:''}"><span>${esc(g==='all'?'All selected':g)}</span><small>${count}${extra?`<span class="reference-count">+${extra}</span>`:''}</small></button>`;};
    const used=new Set(families.flatMap(familyComponents));
    $('subunit-nav').innerHTML=renderButton('all')+families.map(f=>{const buttons=familyComponents(f).map(renderButton).join('');return buttons?`<div class="nav-family"><span class="nav-family-label">${esc(f.label||f.name)}</span>${buttons}</div>`:'';}).join('')+available.filter(g=>!used.has(g)).map(renderButton).join('');
  }
  function renderStats(){const shown=state.view==='2i'?context:main;$('collection-stats').innerHTML=`<b>${new Set(shown.map(o=>o.paper_id)).size}</b> ${state.view==='2i'?'2i papers':'papers'}`;$('chromatin-count').textContent=cardsFor(chromatin).length;$('rna-count').textContent=cardsFor(rnaRows()).length;$('context-count').textContent=cardsFor(context).length;}

  function render(){
    renderNavigation();renderStats();
    const browsable=['chromatin','rna','2i'].includes(state.view);
    $('export-button').hidden=!browsable&&state.view!=='compare';
    document.querySelector('.scope-label').textContent=state.view==='2i'?'2i included · separate context':'Serum / LIF · selected evidence';
    const choices=[...new Set(navigationRows().flatMap(readouts))].filter(Boolean).sort();
    const options=JSON.stringify(choices);
    if($('readout-filter').dataset.options!==options){
      $('readout-filter').innerHTML='<option value="all">All</option>'+choices.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
      $('readout-filter').dataset.options=options;
      if(!choices.includes(state.readout))state.readout='all';
      $('readout-filter').value=state.readout;
    }
    document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===state.view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    $('filters').hidden=!browsable;
    $('compare-count').textContent=state.selected.size||'';
    $('reset-button').hidden=!(state.query||state.subunit!=='all'||state.readout!=='all'||state.importance!=='all');
    const rows=visibleRows(),referenceRows=visibleReferenceInteractions(),cards=cardsFor(rows),referenceCards=cardsFor(referenceRows);
    $('results-count').innerHTML=browsable?`<b>${cards.length}</b> ${state.view==='rna'?'RNA cards':state.view==='2i'?'2i cards':'cards'}${state.subunit!=='all'?` · ${esc(state.subunit)}`:''}${referenceCards.length?` · ${referenceCards.length} context cards`:''}`:state.view==='compare'?`<b>${state.selected.size}</b> selected · compare up to 3 cards`:state.view==='papers'?`${corePapers.length} papers behind the serum evidence`:'Separate systems and assays; excluded from the main comparison';
    $('results-note').textContent='';
    let body='';
    if(state.view==='compare')body=renderCompare();
    else if(state.view==='papers')body=renderPapers();
    else if(state.view==='references')body=renderReferences();
    else if(state.view==='2i')body=renderContext(rows);
    else body=rows.length||referenceRows.length?outcomeLinks()+renderGroups(rows,referenceRows):empty();
    $('content').innerHTML=body;updateTray();
  }
  function outcomeLinks(){
    if(state.view!=='chromatin'||state.subunit!=='all'||state.query||state.readout!=='all')return '';
    return `<div class="outcome-links"><span>Different reported outcomes</span>${list(data.comparisons).filter(c=>c.kind==='contrasting_reported_outcomes').map(c=>`<button class="text-button" type="button" data-suggest="${esc(c.id)}">${c.id==='ring-catalytic-phenotypes'?'RING1 catalytic mutants':'RYBP / YAF2 loss'} ↗</button>`).join('')}</div>`;
  }
  function renderContext(rows){
    const candidates=list(data.context_candidates);
    return `<p class="view-intro context-intro"><b>2i cultures</b></p>${rows.length?renderGroups(rows):empty()}<details class="details-fold context-candidates"><summary>${candidates.length} other candidates · not yet indexed</summary><p class="minor">Pending source review.</p>${candidates.map(p=>`<p><b>${esc(p.title)}</b> (${esc(p.year)}) · ${link(p.url,'Article ↗')}${link(p.pdf_path,'Local PDF ↗')}</p>`).join('')}</details>`;
  }
  function empty(){return `<div class="empty"><h2>${observations.length?'No matching observations':'Evidence review is in progress'}</h2><p>${observations.length?'Try another subunit or broaden the filters.':'Selected experiments will appear here after the source panels have been checked.'}</p>${observations.length?'<button class="text-button" type="button" data-action="reset">Reset filters →</button>':''}</div>`;}
  function renderGroups(rows,referenceRows=[]){
    const cards=cardsFor(rows),referenceCards=cardsFor(referenceRows),groupFor=c=>state.subunit==='all'?c.lead.primary_component:state.subunit;
    const components=[...new Set([...cards,...referenceCards].map(groupFor))],openReferences=Boolean(state.query||state.subunit!=='all');
    const renderComponent=g=>{
      const groupCards=cards.filter(c=>groupFor(c)===g),refs=referenceCards.filter(c=>groupFor(c)===g);
      const related=cardsFor(baseRows().filter(o=>otherFilters(o)&&membership(o).includes(g))).length;
      const count=state.subunit==='all'?`${groupCards.length} shown${related>groupCards.length?` · <button class="text-button group-related" type="button" data-subunit="${esc(g)}">View all ${related} related ↗</button>`:''}`:`${groupCards.length} related cards`;
      const clusters=[...new Set(groupCards.map(c=>presentation(c.lead).edit_cluster||''))];
      const showClusters=clusters.length>1;
      return `<section class="group component-group" data-component="${esc(g)}"><div class="group-heading"><h3>${esc(g)}</h3><span>${count}${refs.length?` · ${refs.length} context`:''}</span></div>${clusters.map(cluster=>`<div class="edit-cluster">${showClusters&&cluster?`<h4>${esc(cluster)}</h4>`:''}${groupCards.filter(c=>(presentation(c.lead).edit_cluster||'')===cluster).map(c=>renderPerturbationCard(c)).join('')}</div>`).join('')}${refs.length?`<details class="interaction-context-fold"${openReferences?' open':''}><summary>Other systems / purified complexes (${refs.length} cards)</summary>${refs.map(c=>renderPerturbationCard(c,true)).join('')}</details>`:''}</section>`;
    };
    const used=new Set();let html='';
    for(const family of families){const genes=familyComponents(family).filter(g=>components.includes(g));if(!genes.length)continue;genes.forEach(g=>used.add(g));html+=`<section class="family-section" data-family="${esc(family.id||family.label)}"><h2 class="family-title">${esc(family.label||family.name)}</h2>${genes.map(renderComponent).join('')}</section>`;}
    return html+components.filter(g=>!used.has(g)).map(renderComponent).join('');
  }
  function cultureLabel(o){
    if(o.category==='2i')return '2i included';
    if(o.category==='human_non_mesc')return interactionData(o).cell_context?.context_label||o.context_label||'Human cells · separate context';
    if(o.category==='in_vitro')return o.context_label||interactionData(o).context_label||'Purified complex · in vitro';
    if(o.include_in_main===false)return o.context_label||interactionData(o).context_label||interactionData(o).cell_context?.context_label||'Separate context';
    return 'Serum / LIF · no 2i';
  }
  function cultureBadge(o){return `<span class="${o.include_in_main===false?'badge context':'minor culture-caption'}">${esc(cultureLabel(o))}</span>`;}
  function interactionTitle(o){const i=interactionData(o);return i.title||i.headline||o.phenotype_label||o.intervention_plain;}
  function measuredSubjects(o){return list(o.measured_subjects).length?o.measured_subjects:list(interactionData(o).measured_subjects);}
  function metricRows(o,overview=false){const i=interactionData(o);return overview&&list(i.overview_metrics).length?list(i.overview_metrics):list(i.metrics);}
  function metricDisplay(m){if(typeof m==='string')return m;if(m.display!=null)return m.display;if(typeof m.value==='number')return `${m.value}${typeof m.uncertainty==='number'?`±${m.uncertainty}`:''}${m.unit?` ${m.unit}`:''}`;return m.value??'Not reported';}
  function metricTable(metrics,cls=''){
    if(!metrics.length)return '';
    const quantities=[...new Set(metrics.map(m=>typeof m==='object'?m.quantity||m.metric||'Measurement':''))],shared=quantities.length===1;
    return `<div class="metric-table-wrap ${cls}"><table class="metric-table${shared?' shared-quantity':''}"><thead><tr><th scope="col">Condition</th>${shared?'': '<th scope="col">Readout</th>'}<th scope="col">${esc(shared?quantities[0]:'Value')}</th></tr></thead><tbody>${metrics.map(m=>`<tr><th scope="row">${esc(typeof m==='object'?m.condition||m.subject||'Comparison':'Additional measurement')}</th>${shared?'':`<td>${esc(typeof m==='object'?m.quantity||m.metric||'':'')}</td>`}<td>${esc(metricDisplay(m))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function metricNotes(metrics,note=''){
    if(note)return `<p class="metric-note">${esc(note)}</p>`;
    const origins=[...new Set(metrics.map(m=>m?.origin).filter(Boolean))];
    const definitions=[...new Set(metrics.flatMap(m=>[m?.denominator||(['%','s','s^-1','µm²/s','nM','µM','relative signal'].includes(m?.unit)?'':m?.unit),typeof m?.uncertainty==='string'?m.uncertainty:m?.error_type]).filter(Boolean))];
    return `${origins.length?`<p class="metric-note"><b>Values:</b> ${esc(origins.join(' · '))}</p>`:''}${definitions.length?`<p class="metric-note">${esc(definitions.join(' · '))}</p>`:''}`;
  }
  function interactionSources(o){return list(interactionData(o).sources).length?list(interactionData(o).sources):list(o.sources);}
  function interactionSourceLinks(o){
    const seen=new Set();
    return interactionSources(o).filter(s=>{
      const key=(s.local_file||s.source_file||sourceUrl(s))+'|'+(s.page||'')+'|'+(s.label||'');
      if(seen.has(key))return false;seen.add(key);return true;
    }).map((s,index)=>{
      const file=s.local_file||s.source_file;
      const href=file?file+(/\.pdf$/i.test(file)&&s.page?`#page=${s.page}`:''):sourceUrl(s);
      return link(href,(s.label||s.figure||`Source ${index+1}`)+(s.page?` · PDF p.${s.page}`:''),'interaction-source-link');
    }).join('');
  }
  function renderInteractionCard(o,supporting=false){
    const i=interactionData(o),x=compactFor(o),shown=metricRows(o,true);
    return `<article class="interaction-card${supporting?' supporting-interaction':''}" id="${esc(o.id)}" data-interaction="${esc(o.id)}">${paperIdentity(o)}<div class="interaction-card-head">${detailButton(o.id,x.perturbation||interactionTitle(o),'chromatin','interaction-title','evidence')}${o.include_in_main===false?cultureBadge(o):''}</div><p class="interaction-subject"><b>Measured:</b> ${esc(measuredSubjects(o))}${x.timing?` · ${esc(x.timing)}`:''}</p>${x.function?`<p class="interaction-condition">${esc(x.function)}</p>`:''}${metricTable(shown)}${i.metric_note||i.overview_note?`<details class="metric-definition"><summary>Definitions</summary>${metricNotes(shown,i.metric_note||i.overview_note)}</details>`:''}<div class="interaction-card-footer">${detailButton(o.id,'Details & sources ↗','chromatin','text-button','condition')}${compareCheckbox(o)}</div></article>`;
  }
  function detailTerms(value){
    if(value==null)return '';
    if(Array.isArray(value))return value.map(x=>typeof x==='object'?detailTerms(x):`<p>${esc(x)}</p>`).join('');
    if(typeof value!=='object')return `<p>${esc(value)}</p>`;
    const labels={k_on_reported:'Association rate reported',k_off_reported:'Dissociation rate reported',fitted_mean_residence_time_reported:'Fitted mean residence time reported',residence_time_reported_for_mutants:'Mutant residence times reported'};
    return `<dl class="interaction-method-facts">${Object.entries(value).map(([key,v])=>`<dt>${esc(labels[key]||key.replace(/_/g,' '))}</dt><dd>${typeof v==='boolean'?(v?'Yes':'No'):typeof v==='object'?detailTerms(v):esc(v)}</dd>`).join('')}</dl>`;
  }
  function curatorFields(inference){
    return Object.fromEntries(Object.entries(inference).filter(([key])=>!['text','source','assumptions'].includes(key)).map(([key,value])=>{
      if(value&&typeof value==='object'&&!Array.isArray(value)&&value.display){
        return [key,Object.fromEntries(['display','formula','origin','assumptions'].filter(k=>value[k]!=null).map(k=>[k,value[k]]))];
      }
      return [key,value];
    }));
  }
  function interactionDetail(o){
    const i=interactionData(o),p=paper(o),x=compactFor(o),metrics=metricRows(o),extra=list(i.additional_metrics);
    const summary=Object.prototype.hasOwnProperty.call(o.detail_readouts||{},'interaction_note')?o.detail_readouts.interaction_note:i.summary||o.result;
    const limits=[...new Set([...list(i.limits),...list(i.limitations),...list(o.limitations)])],inference=i.curator_inference||o.curator_note;
    return `<div class="detail interaction-detail">${paperIdentity(o,true)}<h2 id="dialog-title" tabindex="-1">${esc(x.perturbation||interactionTitle(o))}</h2><div class="interaction-context-line">${o.include_in_main===false?cultureBadge(o):''}<span><b>Measured:</b> ${esc(measuredSubjects(o))}</span></div><div class="detail-links">${link(p.pdf_path,p.local_pdf_label||'PDF ↗')}${link(p.url||o.source,'Article ↗')}</div>${p.local_pdf_version?`<p class="source-version">${esc(p.local_pdf_version)}</p>`:''}${facts(o)}<section class="detail-section" id="detail-chromatin"><h3>Observation</h3>${summary?`<p class="detail-readout-note">${esc(summary)}</p>`:''}${metricTable(metrics)}${i.metric_note?metricNotes(metrics,i.metric_note):''}${extra.length?`<details class="details-fold"><summary>Additional measurements</summary>${extra.every(v=>typeof v==='object'&&(v.quantity||v.metric))?metricTable(extra):detailTerms(extra)}</details>`:''}</section>${comparisonNotes(o)}<details class="details-fold"><summary>Sources</summary><div class="interaction-source-list">${interactionSourceLinks(o)}</div></details>${experimentalDetails(o)}${i.method||i.measurement_details||limits.length?`<details class="details-fold"><summary>Measurement definitions</summary>${metricNotes(metrics)}${i.method?`<p>${esc(i.method)}</p>`:''}${i.measurement_details?detailTerms(i.measurement_details):''}${limits.length?`<ul>${limits.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`:''}</details>`:''}${i.authors_interpretation||o.authors_interpretation?`<details class="details-fold"><summary>Authors’ interpretation</summary>${interpretation(i.authors_interpretation||o.authors_interpretation)}</details>`:''}${inference?`<details class="details-fold"><summary>Curator inference & assumptions</summary>${interpretation(inference)}${typeof inference==='object'&&inference.assumptions?detailTerms(inference.assumptions):''}${typeof inference==='object'?detailTerms(curatorFields(inference)):''}</details>`:''}<details class="details-fold"><summary>Authors & DOI</summary><p>${esc(p.authors)}</p>${link(p.doi?`https://doi.org/${p.doi}`:p.url,p.doi||'Article ↗')}</details></div>`;
  }
  function renderRow(o){
    if(isInteraction(o)&&state.view!=='rna')return renderInteractionCard(o);
    const x=compactFor(o,state.view),ps=rowPanels(o),first=ps[0];
    const rna=hasRna(o)?detailButton(o.id,pairedRna(o)?'RNA ↗':o.rna.chromatin_pairing?.status==='partial'?'RNA · partial match ↗':'RNA · other condition ↗','rna','text-button','evidence'):'';
    return `<article class="observation-row" id="${esc(o.id)}"><div class="change-cell">${paperIdentity(o)}${detailButton(o.id,x.perturbation,state.view,'intervention-title')}${x.function?`<p class="function-note">${esc(x.function)}</p>`:''}${x.timing?`<span class="timing">${esc(x.timing)}</span>`:''}</div><div><p class="result-text">${esc(x.result)}</p>${x.scope?`<p class="scope-note">${esc(x.scope)}</p>`:''}${state.view==='rna'?`<div class="rna-link">${pairingLink(o)}</div>`:rna?`<div class="rna-link">${rna}</div>`:''}</div><div class="evidence-actions">${first?`<button class="panel-button" type="button" data-detail="${esc(o.id)}" data-assay="${esc(state.view)}" data-focus="evidence" aria-label="View ${esc(first.label)}"><img class="panel-thumb" loading="lazy" src="${url(first.path)}" alt="${esc(first.label)}"></button>${detailButton(o.id,(first.short_label||first.label||'Panels').replace(/^Figure\s*/,'Fig '),state.view,'panel-button','evidence')}`:detailButton(o.id,'Details ↗',state.view)}${compareCheckbox(o)}</div></article>`;
  }
  function renderPapers(){return `<div class="paper-grid">${corePapers.map(p=>`<article class="paper-card"><div class="paper-meta">${esc(paperCitation(p))}${p.preprint?' · preprint':''}</div><h2>${esc(p.title)}</h2><div class="paper-links">${link(p.pdf_path,'PDF ↗')}${link(p.url||`https://doi.org/${p.doi}`,'Article ↗')}<button class="text-button" type="button" data-paper="${esc(p.id)}">${main.filter(o=>o.paper_id===p.id).length} source records ↗</button></div>${p.why_selected?`<details class="details-fold"><summary>Selected findings</summary><p>${esc(p.why_selected)}</p></details>`:''}${list(p.supporting_files).length?`<details class="details-fold"><summary>Other source files (${p.supporting_files.length})</summary><div class="source-files">${p.supporting_files.map((f,i)=>link(f.path,f.label+(p.supporting_files.filter(x=>x.label===f.label).length>1?` ${i+1}`:''))).join('')}</div></details>`:''}</article>`).join('')}</div>`;}

  function renderReferences(){
    const refs=[...new Map([...list(data.references),...interactionContextPapers].map(p=>[p.id,p])).values()];
    return `<div class="paper-grid">${refs.map(p=>{const entries=referenceInteractions.filter(o=>o.paper_id===p.id);return `<article class="paper-card"><span class="badge context">${esc(p.context_label||'Supporting context')}</span><div class="paper-meta">${esc(paperCitation(p))}</div><h2>${esc(p.title)}</h2><div class="paper-links">${link(p.pdf_path,p.local_pdf_label||'PDF ↗')}${link(p.url||`https://doi.org/${p.doi}`,'Article ↗')}</div>${entries.length?`<div class="reference-interaction-links">${entries.map(o=>detailButton(o.id,compactFor(o).perturbation,'chromatin','text-button','evidence')).join('')}</div>`:''}${p.why_here||p.note||p.why_selected?`<details class="details-fold"><summary>Context</summary><p>${esc(p.why_here||p.note||p.why_selected)}</p></details>`:''}</article>`;}).join('')}</div>`;
  }
  function renderCompare(){
    const selected=[...state.selected].map(cardForId).filter(Boolean);
    const tools=`<div class="comparison-tools"><button class="text-button" type="button" data-action="chromatin">Choose cards ↗</button>${selected.length?'<button class="text-button" type="button" data-action="clear-comparison">Clear</button>':''}</div>`;
    if(selected.length<2)return `${tools}<h2 class="compare-intro">Compare two or three perturbations</h2>${list(data.comparisons).map(c=>`<section class="suggestion"><h3>${esc(c.title)}</h3><button class="text-button" type="button" data-suggest="${esc(c.id)}">Open comparison →</button></section>`).join('')}`;
    return `${tools}<div class="compare-grid" style="grid-template-columns:repeat(${selected.length},minmax(0,1fr))">${selected.map(card=>{const o=card.lead,x=compactFor(o),rna=card.members.filter(hasRna),numeric=card.members.filter(isInteraction);return `<article class="compare-card" data-card="${esc(card.id)}" data-member-ids="${esc(card.members.map(m=>m.id).join(' '))}"><section class="compare-section">${paperIdentity(o)}${o.include_in_main===false?cultureBadge(o):''}<button class="text-button remove-comparison" type="button" data-remove="${esc(card.id)}" aria-label="Remove ${esc(x.perturbation)}">Remove</button><h3>${esc(x.perturbation)}</h3>${facts(o)}</section><section class="compare-section"><h4>Observed</h4>${renderReadouts(card,'chromatin')}${numeric.map(m=>metricTable(metricRows(m,true))).join('')}</section>${rna.length&&!cardReadouts(card,'chromatin').some(r=>r.kind==='rna')?`<section class="compare-section"><h4>RNA</h4>${rna.map(m=>pairedRna(m)&&presentation(m).rna_inline!==false?`<p>${esc(compactFor(m,'rna').result)}</p>${detailButton(m.id,'RNA ↗','rna','text-button','evidence')}`:detailButton(m.id,compactFor(m,'rna').perturbation+' · RNA ↗','rna','text-button','evidence')).join('')}</section>`:''}<section class="compare-section">${cardSources(card)}${wholeCardButton(o.id,'All results')}${experimentalDetails(o)}</section></article>`;}).join('')}</div>`;
  }
  const isPanelKey=p=>['shared_key','legend'].includes(p.panel_role);
  function panelImage(p,cls=''){
    return `<button class="panel-image ${cls}" type="button" data-panel-zoom="${esc(p.path)}" data-panel-title="${esc(p.label)}" aria-label="Enlarge ${esc(p.label)}"><img loading="lazy" src="${url(p.path)}" width="${p.width||1}" height="${p.height||1}" alt="${esc(p.label)}"></button>`;
  }
  function panelFigure(p,o,keys=[]){
    if(isInteraction(o))return '';const source=p.source_file||paper(o).pdf_path,article=p.source_url||paper(o).url;
    const label=text(p.short_label||p.label).split(/\s+[—–·]\s+/)[0].replace(/^Figure\s*/,'Fig. ');
    const definitions=distinct([p,...keys].flatMap(v=>list(v.legend_key)),v=>v.label+'|'+v.text);
    return `<figure class="panel-figure">${panelImage(p)}${keys.length?`<div class="panel-key-strip">${keys.map(k=>panelImage(k,'native-key')).join('')}</div>`:''}<figcaption><button type="button" class="text-button figure-zoom-link" data-panel-zoom="${esc(p.path)}" data-panel-title="${esc(p.label)}">${esc(label)} · Zoom</button>${link(source?source+(p.page?`#page=${p.page}`:''):article,source&&p.page?`PDF p.${p.page} ↗`:'Article ↗')}</figcaption>${p.reading_note?`<p class="panel-reading-note">${esc(p.reading_note)}</p>`:''}${definitions.length?`<dl class="panel-legend">${definitions.map(v=>`<div><dt>${esc(v.label)}</dt><dd>${esc(v.text)}</dd></div>`).join('')}</dl>`:''}</figure>`;
  }
  function panelGallery(panels,o){
    const keys=panels.filter(isPanelKey),plots=panels.filter(p=>!isPanelKey(p));
    return `<div class="panel-grid">${plots.map((p,i)=>panelFigure(p,o,i===0?keys:[])).join('')}</div>`;
  }
  let zoomScale=1,zoomBaseWidth=1,zoomReturnFocus=null;
  function setZoom(scale){zoomScale=Math.max(.5,Math.min(8,scale));$('zoom-image').style.width=(zoomBaseWidth*zoomScale)+'px';}
  function openPanelZoom(path,title){
    const img=$('zoom-image'),dialog=$('panel-zoom');zoomReturnFocus=document.activeElement;
    $('panel-zoom-title').textContent=title;img.alt=title;
    img.onload=()=>{zoomBaseWidth=Math.min(img.naturalWidth,window.innerWidth-64,(window.innerHeight-110)*img.naturalWidth/img.naturalHeight);setZoom(1);};
    img.src=path;if(!dialog.open)dialog.showModal();$('close-zoom').focus();
  }
  function closePanelZoom(){if($('panel-zoom').open)$('panel-zoom').close();zoomReturnFocus?.focus();}
  function interpretation(v){if(!v)return '';if(Array.isArray(v))return v.map(interpretation).join('');return `<p>${esc(typeof v==='object'?v.text||v.note||text(v):v)}</p>${typeof v==='object'&&sourceUrl(v.source)?link(sourceUrl(v.source),'Interpretation source ↗'):''}`;}
  function facts(o,assay='chromatin'){
    const x=compactFor(o,assay),title=text(x.perturbation).toLowerCase();
    const bits=[x.function,x.timing].filter(v=>v&&!title.includes(text(v).toLowerCase()));
    return bits.length?`<div class="condition-summary">${bits.map(v=>`<span>${esc(v)}</span>`).join('')}</div>`:'';
  }
  let returnFocus=null;
  function openDialog(){const d=$('evidence-dialog');if(!d.open){returnFocus=document.activeElement;d.showModal();}$('close-dialog').focus();}
  function detailReadouts(o,assay){
    const detail=o.detail_readouts||{},rows=list(detail[assay]);
    if(!rows.length)return '';
    const order=readoutOrderFor({members:[o]}),note=detail[assay+'_note'];
    const sorted=[...rows].sort((a,b)=>(order[readoutGroup(a)]??10)-(order[readoutGroup(b)]??10));
    const render=items=>`<dl class="detail-readouts">${items.map(r=>`<div data-readout-kind="${esc(r.kind||'observation')}"><dt>${esc(r.label)}</dt><dd>${esc(r.text)}</dd></div>`).join('')}</dl>`;
    const groups=[...new Set(sorted.map(readoutGroup))];
    const content=rows.length>4&&groups.length>1?groups.map(g=>`<section class="detail-readout-group readout-group-${g}"><h4 class="readout-group-title">${esc(presentation(o).readout_group_labels?.[g]||readoutGroupLabels[g])}</h4>${render(sorted.filter(r=>readoutGroup(r)===g))}</section>`).join(''):render(sorted);
    return `${content}${note?`<p class="detail-readout-note">${esc(note)}</p>`:''}`;
  }
  const distinct=(rows,key)=>[...new Map(rows.map(r=>[key(r),r])).values()];
  function completeCardObservation(id){
    const card=cardForId(id);if(!card||card.members.length===1)return byId(id);
    const members=card.members,lead=card.lead,rna=members.filter(hasRna);
    const copy={...lead,detail_readouts:{}};
    for(const assay of ['chromatin','rna']){
      copy.detail_readouts[assay]=distinct(members.flatMap(o=>list(o.detail_readouts?.[assay])),r=>r.kind+'|'+r.label+'|'+r.text);
      copy.detail_readouts[assay+'_note']=[...new Set(members.map(o=>o.detail_readouts?.[assay+'_note']).filter(Boolean))].join(' · ');
    }
    copy.panels=distinct(members.flatMap(mainPanels),p=>p.path);
    for(const field of ['method_panels','mutation_details','limitations','sources','related_claims','comparison_links'])copy[field]=distinct(members.flatMap(o=>list(o[field])),r=>typeof r==='string'?r:field==='method_panels'?r.path:JSON.stringify(r));
    copy.authors_interpretation=distinct(members.map(o=>o.authors_interpretation).filter(Boolean),v=>JSON.stringify(v));
    copy.curator_note=distinct(members.map(o=>o.curator_note).filter(Boolean),v=>JSON.stringify(v));
    if(rna.length)copy.rna={...rna[0].rna,note:[...new Set(rna.map(o=>o.rna.note).filter(Boolean))].join(' '),panels:distinct(rna.flatMap(rnaPanels),p=>p.path),chromatin_pairing:{...rna[0].rna.chromatin_pairing,detail:[...new Set(rna.map(o=>o.rna.chromatin_pairing?.detail).filter(Boolean))].join(' '),panels:distinct(rna.flatMap(pairingPanels),p=>p.path)}};
    return copy;
  }
  function openResultObservation(o,resultId,assay,updateHash=true){
    const index=/^r\d+$/.test(resultId)?Number(resultId.slice(1)):null;
    const row=index===null?null:presentation(o).readouts?.[index];
    const evidence=resultId==='rna'?{summary:o.detail_readouts?.rna,panels:rnaPanels(o),note:o.detail_readouts?.rna_note}:list(o.result_evidence?.readouts).find(r=>r.index===index);
    if(!evidence)return openObservation(o.id,assay,updateHash,'evidence');
    const x=compactFor(o,assay),p=paper(o),copy={...o,detail_readouts:{[assay]:evidence.summary,[assay+'_note']:evidence.note}};
    $('condition-top').hidden=true;$('dialog-context').textContent='';
    $('dialog-body').innerHTML=`<div class="detail focused-result" data-observation="${esc(o.id)}" data-result="${esc(resultId)}">${paperIdentity(o,true)}<h2 id="dialog-title" tabindex="-1">${esc(x.perturbation)}</h2>${o.include_in_main===false?cultureBadge(o):''}${facts(o,assay)}<div class="detail-links">${wholeCardButton(o.id,'All results',assay)}${link(p.pdf_path||p.url,p.pdf_path?'PDF ↗':'Article ↗')}</div><section class="detail-section" id="${assay==='rna'?'detail-rna':'detail-chromatin'}"><h3>${assay==='rna'?'RNA':'Observation'}</h3>${detailReadouts(copy,assay)||`<p>${esc(row?.text||compactFor(o,assay).result)}</p>`}${panelGallery(list(evidence.panels),o)}</section></div>`;
    openDialog();$('evidence-dialog').scrollTop=0;
    if(updateHash){try{history.replaceState(null,'',`#observation=${encodeURIComponent(o.id)}&assay=${assay}&result=${encodeURIComponent(resultId)}`);}catch(_){}}
  }
  function observationSection(o){
    const summary=detailReadouts(o,'chromatin')||`<p><b>${esc(o.readout)}</b> · ${esc(o.result)}</p>${scope(o)?`<p class="minor">${esc(scope(o))}</p>`:''}`;
    return `<section class="detail-section" id="detail-chromatin"><h3>Observation</h3>${summary}${panelGallery(mainPanels(o),o)}${list(o.related_claims).length?`<details class="details-fold"><summary>Other measured results</summary>${o.related_claims.map(c=>`<section><h3>${esc(c.readout)}</h3>${detailReadouts(c,'chromatin')||`<p>${esc(c.result)}</p>`}${panelGallery(list(c.panels),o)}</section>`).join('')}</details>`:''}</section>`;
  }
  function rnaSection(o){
    if(!hasRna(o))return '';
    return `<section class="detail-section" id="detail-rna"><h3>RNA</h3>${detailReadouts(o,'rna')||`<p><b>${esc(o.rna.assay)}</b></p><p>${esc(o.rna.result)}</p>`}${panelGallery(rnaPanels(o),o)}<div class="related-link">${pairingLink(o)}</div>${o.rna.note||o.rna.chromatin_pairing?.detail?`<details class="details-fold"><summary>Pairing details</summary>${o.rna.note?`<p>${esc(o.rna.note)}</p>`:''}<p>${esc(o.rna.chromatin_pairing?.detail)}</p></details>`:''}</section>`;
  }
  function matchedChromatinSection(o){
    return hasRna(o)&&pairedRna(o)?`<details class="detail-section pairing-fold" id="detail-pairing"><summary>Same-condition chromatin</summary><p class="minor">${esc(o.rna.chromatin_pairing.detail)}</p>${panelGallery(pairingPanels(o),o)}</details>`:'';
  }
  function openObservation(id,assay='chromatin',updateHash=true,focus='condition',resultId='',wholeCard=false){
    const o=wholeCard?completeCardObservation(id):byId(id);if(!o)return;if(o.modality==='rna')assay='rna';const p=paper(o),x=compactFor(o,assay);
    if(resultId)return openResultObservation(o,resultId,assay,updateHash);
    if(isInteraction(o)){openInteractionObservation(o,updateHash,focus);return;}
    $('condition-top').hidden=false;$('dialog-context').innerHTML=`<span class="sticky-target">${esc(x.perturbation)}</span>${x.timing?`<span class="sticky-time">${esc(x.timing)}</span>`:''}`;
    const observation=observationSection(o),rna=rnaSection(o);
    $('dialog-body').innerHTML=`<div class="detail">${paperIdentity(o,true)}<h2 id="dialog-title" tabindex="-1">${esc(x.perturbation)}</h2>${o.include_in_main===false?cultureBadge(o):''}<div class="detail-links">${link(p.pdf_path,p.local_pdf_label||'PDF ↗')}${link(p.url||o.source,'Article ↗')}</div>${p.local_pdf_version?`<p class="source-version">${esc(p.local_pdf_version)}</p>`:''}${facts(o,assay)}${assay==='rna'?rna+(o.modality!=='rna'?`<details class="details-fold"><summary>${pairedRna(o)?'Chromatin observation':'Related chromatin · '+esc(compactFor(o,'chromatin').perturbation)}</summary>${observation}</details>`:''):observation+rna}${matchedChromatinSection(o)}${comparisonNotes(o)}${(list(o.mutation_details).length||list(o.method_panels).length||o.mutation_source)?`<details class="details-fold"><summary>Mutant validation</summary>${list(o.mutation_details).map(m=>`<p><b>${esc(m.protein)} ${esc(m.mouse_mutation||m.mutation)}</b>: ${esc(m.meaning)}${m.paper_label?` (${esc(m.paper_label)})`:''}</p>`).join('')}${panelGallery(list(o.method_panels),o)}${o.mutation_source?.local_file?link(o.mutation_source.local_file+(o.mutation_source.page?`#page=${o.mutation_source.page}`:''),o.mutation_source.label||'Source ↗'):''}</details>`:''}${experimentalDetails(o,assay)}${list(o.authors_interpretation).length?`<details class="details-fold"><summary>Authors’ interpretation</summary>${interpretation(o.authors_interpretation)}</details>`:''}<details class="details-fold"><summary>Authors & DOI</summary><p>${esc(p.authors)}</p>${link(p.doi?`https://doi.org/${p.doi}`:p.url,p.doi||'Article ↗')}</details></div>`;
    openDialog();if(updateHash){try{history.replaceState(null,'',`#observation=${encodeURIComponent(o.id)}&assay=${assay}&focus=${focus}${wholeCard?'&view=card':''}`);}catch(_){}}
    if(focus==='condition')$('evidence-dialog').scrollTop=0;
    else{const anchor=$(focus==='pairing'?'detail-pairing':assay==='rna'?'detail-rna':'detail-chromatin');if(anchor){if(anchor.tagName==='DETAILS')anchor.open=true;anchor.style.scrollMarginTop=($('evidence-dialog').querySelector('.dialog-bar').offsetHeight+12)+'px';anchor.scrollIntoView({block:'start'});}}
  }
  function openInteractionObservation(o,updateHash=true,focus='condition'){
    $('condition-top').hidden=false;
    const x=compactFor(o);$('dialog-context').innerHTML=`<span class="sticky-target">${esc(x.perturbation)}</span>${x.timing?`<span class="sticky-time">${esc(x.timing)}</span>`:''}`;
    $('dialog-body').innerHTML=interactionDetail(o);
    openDialog();
    if(updateHash){try{history.replaceState(null,'',`#observation=${encodeURIComponent(o.id)}&assay=chromatin&focus=${focus}`);}catch(_){}}
    if(focus==='condition')$('evidence-dialog').scrollTop=0;
    else{const anchor=$('detail-chromatin');if(anchor){anchor.style.scrollMarginTop=($('evidence-dialog').querySelector('.dialog-bar').offsetHeight+12)+'px';anchor.scrollIntoView({block:'start'});}}
  }
  function closeDialog(updateLocation=true){const d=$('evidence-dialog');if(d.open)d.close();if(updateLocation){try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}returnFocus?.focus();}
  function showGuide(){
    $('condition-top').hidden=true;$('dialog-context').textContent='COLLECTION';
    $('dialog-body').innerHTML=`<div class="detail"><h2 id="dialog-title">Read progressively</h2><p>Click a result for its panels and a short summary. Click the perturbation title or All results for the complete card. Experimental details and interpretations open separately.</p><p>Component counts use perturbation cards, including related measurements and combined backgrounds. “Shown” counts cards filed under that heading; “View all” opens every related card. Same-condition readouts can share a card; their source entries stay individually linked.</p><p>RNA appears only when measured. Links identify matched, partial or different-condition chromatin evidence.</p><p>Serum/LIF mESCs are the default. 2i, human cells and purified complexes are labelled separately. Single-molecule summaries retain quantity definitions; conditional rate calculations stay with their assumptions.</p></div>`;openDialog();
  }
  function updateTray(){$('compare-tray').hidden=!state.selected.size||state.view==='compare';$('tray-label').textContent=`${state.selected.size} of 3 cards selected`;$('compare-selected').disabled=state.selected.size<2;}
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,3500);}
  function reset(){state.subunit='all';state.query='';state.readout='all';state.importance='all';$('search').value='';$('readout-filter').value='all';$('importance-filter').value='all';render();}
  function setView(view){state.view=view;state.readout='all';render();}
  function exportSelection(){
    if(!['chromatin','rna','2i','compare'].includes(state.view))return;
    const cards=state.view==='compare'?[...state.selected].map(cardForId).filter(Boolean):cardsFor(visibleRows());
    const supportCards=state.view==='chromatin'?cardsFor(visibleReferenceInteractions()):[],rows=cardRecords(cards),supporting=cardRecords(supportCards);
    const blob=new Blob([JSON.stringify({schema:data.schema,updated:data.updated,view:state.view,selection_mode:state.view==='compare'?'explicit_comparison':'active_view_filters',filter_unit:'perturbation_card',filters:state.view==='compare'?null:{subunit:state.subunit,query:state.query,readout:state.readout,importance:state.importance},selected_cards:cards.map(c=>({id:c.id,merge_group:presentation(c.lead).merge_group||null,observation_ids:c.members.map(o=>o.id)})),selected_observation_ids:rows.map(o=>o.id),selected_categories:[...new Set(rows.map(o=>o.category||'serum_no_2i'))],observations:rows,supporting_context_observations:supporting,papers:papers.filter(p=>[...rows,...supporting].some(o=>o.paper_id===p.id))},null,2)],{type:'application/json'});
    const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='polycomb-selected-experiments.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1500);toast(`${cards.length} cards · ${rows.length} source records exported.`);
  }
  document.addEventListener('click',e=>{const zoom=e.target.closest('[data-panel-zoom]');if(zoom){openPanelZoom(zoom.dataset.panelZoom,zoom.dataset.panelTitle||'Figure');return;}const remove=e.target.closest('[data-remove]');if(remove){state.selected.delete(remove.dataset.remove);render();return;}const whole=e.target.closest('[data-card-detail]');if(whole){openObservation(whole.dataset.cardDetail,whole.dataset.assay||'chromatin',true,'condition','',true);return;}const detail=e.target.closest('[data-detail]');if(detail){openObservation(detail.dataset.detail,detail.dataset.assay||'chromatin',true,detail.dataset.focus||'condition');return;}const view=e.target.closest('[data-view]');if(view){setView(view.dataset.view);return;}const sub=e.target.closest('[data-subunit]');if(sub){state.subunit=sub.dataset.subunit;if(!['chromatin','rna','2i'].includes(state.view))state.view='chromatin';render();return;}const suggestion=e.target.closest('[data-suggest]');if(suggestion){const c=list(data.comparisons).find(x=>x.id===suggestion.dataset.suggest);state.selected=new Set(list(c?.observation_ids).map(cardLeadId).filter(Boolean).slice(0,3));setView('compare');return;}const source=e.target.closest('[data-paper]');if(source){const p=papers.find(x=>x.id===source.dataset.paper);if(p){state.subunit='all';state.query=p.title.toLowerCase();state.readout='all';state.importance='all';$('search').value=p.title;state.view='chromatin';render();window.scrollTo({top:0});}return;}const action=e.target.closest('[data-action]')?.dataset.action;if(action==='reset')reset();if(action==='chromatin')setView('chromatin');if(action==='clear-comparison'){state.selected.clear();render();}});
  document.addEventListener('change',e=>{const c=e.target.closest('[data-select]');if(!c)return;const id=c.dataset.select;if(c.checked){if(state.selected.size>=3){c.checked=false;toast('Choose up to three cards. Uncheck one to change the comparison.');return;}state.selected.add(id);}else state.selected.delete(id);document.querySelectorAll('[data-select]').forEach(x=>x.checked=state.selected.has(x.dataset.select));$('compare-count').textContent=state.selected.size||'';updateTray();});
  $('search').addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();render();});$('readout-filter').addEventListener('change',e=>{state.readout=e.target.value;render();});$('importance-filter').addEventListener('change',e=>{state.importance=e.target.value;render();});$('filters').addEventListener('submit',e=>e.preventDefault());$('reset-button').addEventListener('click',reset);$('compare-selected').addEventListener('click',()=>setView('compare'));$('clear-selected').addEventListener('click',()=>{state.selected.clear();render();});$('close-dialog').addEventListener('click',closeDialog);$('condition-top').addEventListener('click',()=>{$('evidence-dialog').scrollTop=0;$('dialog-title')?.focus({preventScroll:true});});$('evidence-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});$('evidence-dialog').addEventListener('click',e=>{if(e.target!==$('evidence-dialog'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();});$('guide-button').addEventListener('click',showGuide);$('export-button').addEventListener('click',exportSelection);
  function syncLocation(){const hash=new URLSearchParams(location.hash.slice(1)),id=hash.get('observation');if(id&&byId(id))openObservation(id,hash.get('assay')||'chromatin',false,hash.get('focus')||'condition',hash.get('result')||'',hash.get('view')==='card');else if($('evidence-dialog').open)closeDialog(false);}
  $('close-zoom').addEventListener('click',closePanelZoom);$('zoom-in').addEventListener('click',()=>setZoom(zoomScale*1.5));$('zoom-out').addEventListener('click',()=>setZoom(zoomScale/1.5));$('zoom-fit').addEventListener('click',()=>setZoom(1));$('panel-zoom').addEventListener('cancel',e=>{e.preventDefault();closePanelZoom();});$('panel-zoom').addEventListener('click',e=>{if(e.target===$('panel-zoom'))closePanelZoom();});
  window.addEventListener('hashchange',syncLocation);window.addEventListener('popstate',syncLocation);renderStats();render();syncLocation();
})();
