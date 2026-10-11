import {
  actionCost,
  AD_TONES,
  ATTRIBUTES,
  CAMPAIGN_ACTIONS,
  CHANNELS,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  formatMoney,
  GameConstants,
  INTERVIEW_TYPE_INFO,
  INTERVIEW_TYPES,
  MEDIA_CHANNELS,
  STAFF_LEVELS,
  STAFF_ROLE_IDS,
  STAFF_ROLES,
  STRATEGY_PROFILES,
  STRATEGY_TEXT,
  type AttributeId,
  type CampaignActionDefinition,
  type DebateStrategy,
  type GameState,
} from '@republica/game-engine';
import { Badge, cn, Icon, Panel } from '@republica/ui';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { PageShell } from '../../components/PageShell';
import { useGame } from '../../store/gameStore';

const V = GameConstants.voter;
const C = GameConstants.campaign;
const A = GameConstants.ads;
const E = GameConstants.election;

/* ---------- blocos de texto ---------- */

function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-paper/90">{children}</p>;
}

function H({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 font-display text-base font-semibold text-gold-400">{children}</h3>;
}

function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-paper/90">{children}</ul>
  );
}

function Tip({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'bad' }) {
  return (
    <div
      className={cn(
        'flex gap-2 rounded-xl border-2 px-3 py-2 text-sm',
        tone === 'gold' ? 'border-gold-500/40 bg-gold-500/10' : 'border-bad/40 bg-bad/10',
      )}
    >
      <Icon
        name={tone === 'gold' ? 'lightbulb' : 'flame'}
        size={16}
        className={cn('mt-0.5 shrink-0', tone === 'gold' ? 'text-gold-400' : 'text-bad')}
      />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-xl border-2 border-ink-600 bg-ink-950 px-3 py-2 font-mono text-xs leading-relaxed text-paper">
      {children}
    </pre>
  );
}

function Table({ head, rows }: { head: ReactNode[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wider text-muted">
            {head.map((h, i) => (
              <th key={i} className="py-1 pr-3 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-ink-700 align-top">
              {r.map((c, j) => (
                <td key={j} className="py-1.5 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const pctNum = (v: number) => `${Math.round(v * 100)}%`;
const n2 = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function attrList(attrs: Partial<Record<AttributeId, number>>): string {
  const ids = Object.keys(attrs) as AttributeId[];
  return ids.length ? ids.map((id) => ATTRIBUTES[id].name).join(', ') : '—';
}

function effectList(a: CampaignActionDefinition): string[] {
  const fx = a.effects;
  const out: string[] = [];
  if (fx.presence) out.push(`Presença +${fx.presence} na região`);
  if (fx.knowledge) out.push(`Conhecimento +${fx.knowledge} na região`);
  if (fx.knowledgeAll) out.push(`Conhecimento +${fx.knowledgeAll} em todo o território`);
  if (fx.regionalMomentum) out.push(`Momentum regional +${fx.regionalMomentum}`);
  if (fx.popMomentum) out.push(`Momentum +${fx.popMomentum} no grupo escolhido`);
  if (fx.audienceMomentum && fx.channel)
    out.push(
      `Momentum ×${fx.audienceMomentum} nos grupos que consomem ${CHANNELS[fx.channel].name}`,
    );
  if (fx.spillover) out.push(`Transborda ${pctNum(C.spilloverFactor)} para regiões vizinhas`);
  if (fx.militantPowered) out.push('Rende mais quanto mais militantes por eleitor');
  if (fx.enthusiasm) out.push(`Entusiasmo +${fx.enthusiasm}`);
  if (fx.militants) out.push(`Militantes +${fx.militants}%`);
  if (fx.fundraising) out.push(`Arrecada ~${formatMoney(fx.fundraising)} × escala`);
  if (fx.energyRestore) out.push(`Recupera ${fx.energyRestore} de energia`);
  if (fx.prep) out.push(`Preparação +${pctNum(fx.prep)} para debates/entrevistas`);
  if (a.target === 'proposal' || a.target === 'unitAndProposal')
    out.push('Lança uma proposta (muda sua posição percebida e vira promessa)');
  return out;
}

/* ---------- seções ---------- */

interface Section {
  id: string;
  title: string;
  icon: string;
  keywords: string;
  body: (game: GameState | null) => ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'inicio',
    title: 'Primeiros passos',
    icon: 'rocket',
    keywords: 'começar ciclo fases tempo avançar dia semana interrupção',
    body: () => (
      <>
        <P>
          Você cria um político, escolhe um partido e disputa uma eleição. Se vencer, governa (ou
          legisla) até a próxima eleição e decide o rumo da carreira. Cada partida é diferente:
          eleitores, adversários e eventos são sorteados por uma semente.
        </P>
        <H>O ciclo do jogo</H>
        <Ul>
          <li>
            <b>Campanha</b> — o tempo anda em dias. Você gasta dinheiro e energia em ações,
            propaganda, entrevistas e debates para subir nas pesquisas.
          </li>
          <li>
            <b>Dia da eleição</b> — a votação é simulada com ruído próprio; pode haver 2º turno.
          </li>
          <li>
            <b>Mandato</b> — o tempo anda em meses. Orçamento, leis, Congresso, grupos de interesse
            e economia.
          </li>
          <li>
            <b>Carreira</b> — concorrer a outro cargo, trocar ou fundar partido, tirar um ano
            sabático ou se aposentar.
          </li>
        </Ul>
        <H>Controlando o tempo</H>
        <P>
          Use a barra inferior para avançar 1 dia, 1 semana ou 1 mês. O tempo para sozinho quando
          algo exige sua atenção: um evento para decidir, um debate marcado, o dia da eleição ou o
          fim do mandato. Ações de campanha com duração (ex.: caravana, 2 dias) também fazem o tempo
          passar.
        </P>
        <Tip>
          Em cada dia, primeiro gaste energia com ações rápidas (duração 0) e depois avance. Energia
          que sobra no fim do dia é desperdiçada se já estiver perto de 100.
        </Tip>
      </>
    ),
  },
  {
    id: 'eleitores',
    title: 'Como o eleitor decide',
    icon: 'users',
    keywords:
      'pops utilidade fórmula modelo voto ideologia partido apelo temas momentum presença softmax conhecimento',
    body: () => (
      <>
        <P>
          O jogo não simula pessoas individuais: o eleitorado é dividido em <b>Pops</b> — grupos de
          uma profissão num estado (ex.: aposentados de SP). Cada Pop tem ideologia em 9 eixos,
          prioridades de temas, identificação com partidos, satisfação, humor e taxa de
          comparecimento. Veja todos na tela <b>Eleitores</b>.
        </P>
        <H>A nota que cada grupo dá a cada candidato</H>
        <P>Para cada região × grupo × candidato, o jogo calcula uma &ldquo;utilidade&rdquo;:</P>
        <Formula>
          {`utilidade = ${n2(V.weights.ideology)} × (1 − 2 × distância ideológica)
          + ${n2(V.weights.party)} × identificação com o partido
          + ${n2(V.weights.appeal)} × apelo pessoal
          + ${n2(V.weights.issues)} × aderência aos temas
          + ${n2(V.weights.momentum)} × momentum (mais forte em grupos voláteis)
          + ${n2(V.weights.presence)} × presença na região
          + ${n2(V.weights.economy)} × voto retrospectivo (economia)
          + ${n2(V.weights.incumbency)} se você é o atual ocupante
          − ${n2(V.weights.rejection)} × rejeição`}
        </Formula>
        <Ul>
          <li>
            <b>Distância ideológica</b> — entre o grupo e a sua posição <i>percebida</i> (não a
            real). Eixos ligados aos temas que o grupo prioriza pesam mais.
          </li>
          <li>
            <b>Partido</b> — o maior peso, e o que menos muda numa campanha. É por isso que a
            legenda importa.
          </li>
          <li>
            <b>Apelo pessoal</b> — carisma {pctNum(V.appealWeights.charisma)}, credibilidade{' '}
            {pctNum(V.appealWeights.credibility)}, comunicação{' '}
            {pctNum(V.appealWeights.communication)}, popularidade{' '}
            {pctNum(V.appealWeights.popularity)} e oratória {pctNum(V.appealWeights.oratory)}.
          </li>
          <li>
            <b>Temas</b> — sua ênfase em cada tema (sobe com propostas, discursos e propaganda
            temática) cruzada com as prioridades do grupo.
          </li>
          <li>
            <b>Voto retrospectivo</b> — se o grupo está satisfeito, quem governa ganha; se está
            insatisfeito, a oposição ganha.
          </li>
        </Ul>
        <H>Da nota ao voto</H>
        <Formula>
          {`peso = conhecimento^${V.knowledgeExponent} × e^(utilidade ÷ ${V.temperature}) × (1 − rejeição)
fatia = seu peso ÷ soma dos pesos de todos os candidatos`}
        </Formula>
        <Ul>
          <li>
            O divisor {V.temperature} deixa o eleitor sensível: cada +{V.temperature} de utilidade
            multiplica seu peso por ~2,7. Pequenas vantagens viram muitos votos.
          </li>
          <li>
            <b>Ninguém vota em quem não conhece.</b> Conhecimento de 20% vale 0,09; de 80% vale 0,72
            — oito vezes mais.
          </li>
          <li>A rejeição pesa duas vezes: tira utilidade e ainda corta o peso diretamente.</li>
        </Ul>
        <Tip>
          Ordem de prioridade típica: 1) ser conhecido, 2) não ser rejeitado, 3) estar perto
          ideologicamente dos grupos grandes, 4) presença e momentum onde a disputa está apertada.
        </Tip>
      </>
    ),
  },
  {
    id: 'intencao',
    title: 'Intenção de voto, indecisos e brancos',
    icon: 'vote',
    keywords: 'indecisos brancos nulos comparecimento válidos total',
    body: () => (
      <>
        <P>
          A intenção de voto não é um número guardado: ela é <b>recalculada todos os dias</b> a
          partir do estado da campanha. Suas ações mexem nas variáveis (conhecimento, presença,
          momentum, rejeição, ideologia percebida) e o modelo transforma isso em percentuais.
        </P>
        <H>Indecisos</H>
        <Formula>
          {`indecisos = ${V.baseUndecided} × (${V.undecidedEndFactor} + ${n2(1 - V.undecidedEndFactor)} × fração da campanha que falta)
          + ${V.undecidedKnowledgeFactor} × (1 − conhecimento do candidato mais conhecido)
          − ${V.undecidedEngagementFactor} × engajamento do grupo
(entre ${pctNum(V.minUndecided)} e ${pctNum(V.maxUndecided)})`}
        </Formula>
        <P>
          Os indecisos caem naturalmente à medida que a eleição se aproxima — por isso todos os
          candidatos tendem a &ldquo;subir&rdquo; no total no fim da campanha. No dia da eleição,{' '}
          {pctNum(E.undecidedAbstainShare)} dos indecisos anulam ou se abstêm e o resto se divide
          com leve vantagem para os líderes.
        </P>
        <H>Brancos e nulos</H>
        <P>
          {pctNum(V.blankNullBase)} + {pctNum(V.blankNullRejectionFactor)} × rejeição média dos
          candidatos (máximo 30%). Campanhas sujas, em que todos ficam rejeitados, aumentam o voto
          nulo.
        </P>
        <H>Total × válidos</H>
        <P>
          <b>Total</b> conta indecisos e brancos no denominador; <b>válidos</b> só considera votos
          em candidatos. Para vencer no 1º turno de uma eleição majoritária é preciso mais de{' '}
          {pctNum(E.runoffThreshold)} dos válidos.
        </P>
      </>
    ),
  },
  {
    id: 'rejeicao',
    title: 'Rejeição',
    icon: 'user-x',
    keywords: 'rejeição credibilidade escândalo gafe ataque polarização extremismo',
    body: () => (
      <>
        <Formula>
          {`rejeição = conhecimento × (
     ${V.baseRejection}                                  base
   + ${V.rejectionCredibilityFactor} × (100 − credibilidade) ÷ 100     credibilidade baixa
   + polarização × (distância − ${V.rejectionDistanceThreshold}), se positiva      ideologia distante
   + modificador de rejeição ÷ 100                    gafes, ataques, debates
   + ${V.rejectionScandalFactor} × escândalo )
(máximo ${pctNum(V.rejectionMax)})
polarização = ${V.rejectionPolarizationFactor} × (0,6 + o quanto suas posições são extremas)`}
        </Formula>
        <Ul>
          <li>Quem não te conhece não te rejeita: a rejeição cresce junto com o conhecimento.</li>
          <li>
            Posições extremas aumentam a rejeição em todos os grupos ideologicamente distantes.
          </li>
          <li>
            O que sobe a rejeição: gafes (+{C.gaffeRejection}), propaganda comparativa ou de ataque
            (todo dia no ar), ser atacado por adversários, debate ruim ou recusado, respostas
            agressivas, escândalos.
          </li>
          <li>
            O que baixa: o modificador decai 0,5% ao dia; respostas empáticas bem dadas; estratégia
            conciliadora em debates; credibilidade alta.
          </li>
        </Ul>
        <Tip tone="bad">
          Rejeição é difícil de desfazer. Antes de atacar, compare na tela{' '}
          <Link to="/jogo/impacto" className="underline">
            Impacto
          </Link>{' '}
          o quanto o ataque tirou do adversário com o quanto subiu a sua rejeição.
        </Tip>
      </>
    ),
  },
  {
    id: 'alavancas',
    title: 'Conhecimento, presença e momentum',
    icon: 'trending-up',
    keywords:
      'conhecimento presença momentum decaimento desgaste retornos decrescentes saturação transbordo',
    body: () => (
      <>
        <P>São as três &ldquo;alavancas&rdquo; que as ações de campanha movem.</P>
        <Table
          head={['Alavanca', 'Onde vale', 'Ganho', 'Desgaste por dia']}
          rows={[
            [
              <b key="k">Conhecimento</b>,
              'por região (0–100)',
              'retorno decrescente: ganho × (1 − atual/100)',
              `${n2(C.knowledgeDecayPerDay * 100)}% — quase permanente`,
            ],
            [
              <b key="p">Presença</b>,
              'por região (0–100)',
              'ganho × (1 − atual/120)',
              `${n2(C.presenceDecayPerDay * 100)}% (o coordenador regional reduz)`,
            ],
            [
              <b key="m">Momentum regional</b>,
              'por região (−50 a +50)',
              `teto suave em ${C.momentumSoftCap}: quanto mais alto, menos rende`,
              `${n2(C.regionalMomentumDecayPerDay * 100)}%`,
            ],
            [
              <b key="g">Momentum por grupo</b>,
              'por tipo de eleitor, em todo o território',
              `teto suave em ${C.momentumSoftCap}`,
              `${n2(C.popMomentumDecayPerDay * 100)}%`,
            ],
          ]}
        />
        <Ul>
          <li>
            <b>Conhecimento é investimento</b>: quase não se perde. Faça cedo.
          </li>
          <li>
            <b>Presença e momentum são manutenção</b>: perdem ~3% ao dia — em 3 semanas, metade
            some. Concentre esse esforço no fim da campanha e nas regiões decisivas.
          </li>
          <li>
            O desgaste atinge <b>todos os candidatos</b>. Por isso, num dia parado, você pode até
            subir um pouco se os adversários tinham mais presença acumulada.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'acoes',
    title: 'Ações de campanha',
    icon: 'megaphone',
    keywords:
      'comício caravana porta a porta redes tv rádio podcast discurso proposta jantar militância treinamento descanso energia custo risco gafe fadiga',
    body: (game) => (
      <>
        <P>
          Cada ação custa dinheiro e energia, pode consumir dias e tem risco de gafe. O efeito real
          é multiplicado por:
        </P>
        <Formula>
          {`efeito = base × atributos relevantes (${n2(C.attributeEffectMin)} a ${n2(C.attributeEffectMin + C.attributeEffectRange)})
       × equipe × entusiasmo (0,8 a 1,2) × cansaço (0,75 se energia < 15)
       × repetição: 1 ÷ (1 + ${C.repeatFatigue} × vezes que fez a mesma ação nos últimos 3 dias)
       × sorte (${C.variationMin} a ${C.variationMax})`}
        </Formula>
        <Table
          head={[
            'Ação',
            game?.campaign ? 'Custo (neste jogo)' : 'Custo base',
            'Energia',
            'Dias',
            'Risco',
            'Efeitos',
            'Atributos que ajudam',
          ]}
          rows={CAMPAIGN_ACTIONS.map((a) => [
            <span key="n" className="flex items-center gap-1 font-bold">
              <Icon name={a.icon} size={13} className="text-gold-400" />
              {a.name}
            </span>,
            a.cost > 0 ? formatMoney(game?.campaign ? actionCost(game, a) : a.cost) : 'grátis',
            a.energy,
            a.days === 0 ? 'rápida' : a.days,
            a.risk > 0 ? pctNum(a.risk) : '—',
            <ul key="e" className="space-y-0.5">
              {effectList(a).map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>,
            attrList(a.attributes),
          ])}
        />
        <P>
          O custo base é multiplicado pela <b>escala da campanha</b> (cargo × tamanho do eleitorado)
          e pela dificuldade. O risco real cai com experiência e com o assessor de imprensa.
        </P>
        <Tip>
          Alterne ações: a mesma ação 2× em 3 dias rende 1/1,5; 3× rende 1/2. Campanha regional
          intensiva e caravana têm o maior efeito local e transbordam para as vizinhas — use-as nas
          regiões mais populosas.
        </Tip>
        <Tip>
          Gafe: rejeição +{C.gaffeRejection}, credibilidade {C.gaffeCredibility} e notícia ruim.
          Ações de risco alto (redes, TV) ficam mais seguras com <b>assessor de imprensa</b> e
          experiência.
        </Tip>
      </>
    ),
  },
  {
    id: 'semana',
    title: 'Campanha dinâmica: a semana',
    icon: 'flame',
    keywords:
      'semana reunião cartas jogada pauta tema em alta rivais estilo tática ataque dinâmica',
    body: () => (
      <>
        <P>
          Com a <b>campanha dinâmica</b> ligada (padrão em jogos novos), toda semana o tempo para
          numa <b>reunião de campanha</b> com três coisas:
        </P>
        <Ul>
          <li>
            <b>Pauta da semana</b> — um tema domina o noticiário. Quem tem ênfase nele ganha votos
            entre os eleitores que se importam com o tema. A ênfase esfria 25% por semana (sem cair
            abaixo da base do seu partido): pauta velha não rende. Suba a ênfase com a carta da
            pauta, propostas, discursos e propaganda temática.
          </li>
          <li>
            <b>Rivais com estilo</b> — Populista, Técnico, Agressivo, Máquina ou Digital. Cada um
            rende mais em grupos diferentes. Toda semana eles olham as pesquisas e escolhem uma
            tática: <i>atacar</i> (quem caiu ou quem viu você crescer), <i>disputar</i> suas
            melhores regiões, <i>surfar a pauta</i> ou <i>reforçar a base</i>. A reunião mostra o
            que os três principais vão fazer.
          </li>
          <li>
            <b>3 cartas de jogada</b> — oportunidades e dilemas montados a partir da sua situação
            (região mais fraca, rival líder, debate chegando, reta final). Cada carta tem custo,
            efeito e, às vezes, risco: a porcentagem diz a chance de dar certo, e o que acontece se
            der errado aparece embaixo. Dá para seguir sem jogada.
          </li>
        </Ul>
        <Tip>
          Rival &ldquo;atacando você&rdquo;? Procure a carta <b>Responder aos ataques</b>. Debate em
          até 10 dias? Aparece a <b>Imersão para o debate</b>. Reta final? <b>Virada final</b>. A
          agenda automática cuida do dia a dia; a reunião semanal é onde você decide a estratégia.
        </Tip>
        <P>
          Nos testes com bots, escolher as cartas com critério rendeu ~33% dos válidos em média,
          contra ~23% de quem pulava todas — e nenhuma rotina da agenda venceu em todos os cenários.
        </P>
      </>
    ),
  },
  {
    id: 'agenda',
    title: 'Agenda automática',
    icon: 'calendar-check',
    keywords:
      'agenda rotina automática automatizar programar todo dia repetir entrevista automática',
    body: () => (
      <>
        <P>
          Na tela{' '}
          <Link to="/jogo/agenda" className="font-bold text-gold-400 underline">
            Agenda
          </Link>{' '}
          você monta uma rotina e a equipe a executa sozinha <b>a cada dia que você avança</b> (1
          dia, 1 semana, 1 mês ou Avançar). Comece por um modelo pronto (Equilibrada, Mídia ou Rua)
          e ajuste.
        </P>
        <Ul>
          <li>
            <b>Prioridade</b>: os compromissos rodam na ordem da lista. Use ↑ ↓ para reordenar.
          </li>
          <li>
            <b>Rápidas</b> (redes, rádio, jornal, podcast) podem rodar várias no mesmo dia.{' '}
            <b>Atividades do dia</b> (comício, TV, caminhada, entrevista longa…) ocupam o dia: só a
            primeira que couber roda. Caravana (2 dias) e campanha intensiva (3 dias) ocupam os dias
            seguintes.
          </li>
          <li>
            <b>Frequência</b>: todo dia, dia sim/dia não, a cada 3 dias ou 1× por semana. Ex.:
            &ldquo;Programa de TV a cada 3 dias&rdquo; acima de &ldquo;Comício todo dia&rdquo; = TV
            num dia, comício nos outros dois.
          </li>
          <li>
            <b>Região automática</b> escolhe onde há mais eleitores e menos presença sua;{' '}
            <b>grupo automático</b>, o maior grupo em que você ainda tem pouco momentum. Também dá
            para fixar.
          </li>
          <li>
            <b>Entrevistas automáticas</b>: a assessoria responde com o estilo que rende mais para
            os seus atributos, sem fazer promessas, sem atacar e sem mudar sua posição. Para
            entrevistas decisivas, prefira responder você mesmo.
          </li>
          <li>
            Proteções: a agenda nunca deixa a energia abaixo de 15, respeita o <b>caixa mínimo</b>{' '}
            que você definir e pode <b>descansar</b> quando a energia estiver baixa. O que for
            pulado aparece na notificação.
          </li>
          <li>
            Ações feitas à mão continuam valendo; dias consumidos por ações manuais longas não rodam
            a agenda. Eventos, debates e o dia da eleição continuam parando o tempo.
          </li>
        </Ul>
        <Tip>
          Ative a agenda e use o{' '}
          <Link to="/jogo/impacto" className="underline">
            Impacto
          </Link>{' '}
          para ver o que cada compromisso rendeu. Troque o que não rende por algo que rende.
        </Tip>
      </>
    ),
  },
  {
    id: 'propaganda',
    title: 'Propaganda paga',
    icon: 'tv',
    keywords:
      'propaganda anúncio canal tom ataque comparativa propositiva segmentação intensidade multa',
    body: () => (
      <>
        <P>
          A propaganda é paga antecipadamente e roda sozinha todos os dias. Cada dia no ar gera
          conhecimento e persuasão: {pctNum(A.regionalShare)} vira momentum nas regiões escolhidas e{' '}
          {pctNum(1 - A.regionalShare)} vira momentum nos grupos que consomem aquele canal.
        </P>
        <Table
          head={[
            'Canal',
            'Custo/dia (base)',
            'Alcance',
            'Persuasão',
            'Conhecimento',
            'Risco/dia',
            'Segmenta?',
            'Regional?',
          ]}
          rows={MEDIA_CHANNELS.map((id) => {
            const c = CHANNELS[id];
            return [
              <span key="n">
                <b>{c.name}</b>
                <div className="text-muted">{c.description}</div>
              </span>,
              formatMoney(c.dailyCost),
              pctNum(c.reach),
              pctNum(c.persuasion),
              pctNum(c.knowledge),
              `${n2(c.risk * 100)}%`,
              c.targetable ? 'sim' : 'não',
              c.regional ? 'sim' : 'não',
            ];
          })}
        />
        <H>Tom</H>
        <Table
          head={['Tom', 'Para você', 'Tira do alvo', 'Sua rejeição por dia', 'Risco']}
          rows={Object.values(AD_TONES).map((t) => [
            <span key="n">
              <b>{t.name}</b>
              <div className="text-muted">{t.description}</div>
            </span>,
            pctNum(t.own),
            t.opponent ? pctNum(t.opponent) : '—',
            t.rejection ? `+${n2(t.rejection)}` : '—',
            `×${n2(t.risk)}`,
          ])}
        />
        <Ul>
          <li>
            <b>Segmentar</b> por grupo custa {pctNum(A.targetingCostMultiplier - 1)} a mais, mas
            rende ×{n2(A.targetingEfficiency)} nesses grupos.
          </li>
          <li>
            <b>Intensidade</b> tem retorno decrescente (efeito ∝ intensidade<sup>0,8</sup>).
          </li>
          <li>
            Comunicação do candidato, marqueteiro e social media (canais digitais) aumentam a
            eficiência.
          </li>
          <li>
            Repercussão negativa: rejeição +1,5; em ataques, 35% de chance de multa e retirada da
            peça.
          </li>
        </Ul>
        <Tip>
          Veja na tela{' '}
          <Link to="/jogo/impacto" className="underline">
            Impacto
          </Link>{' '}
          a coluna &ldquo;por R$ 100 mil&rdquo; para descobrir qual canal rende mais para o seu
          perfil de eleitorado.
        </Tip>
      </>
    ),
  },
  {
    id: 'financas',
    title: 'Dinheiro, equipe e militância',
    icon: 'piggy-bank',
    keywords:
      'dinheiro doações arrecadação fundo partidário equipe contratar salário militantes entusiasmo energia',
    body: () => (
      <>
        <H>Entradas</H>
        <Ul>
          <li>Repasse inicial do partido e fundo partidário diário.</li>
          <li>
            <b>Doações</b> — crescem com entusiasmo × intenção de voto × capacidade de campanha.
            Subir nas pesquisas traz dinheiro.
          </li>
          <li>Vaquinha da militância, jantares de arrecadação e grupos de interesse simpáticos.</li>
        </Ul>
        <H>Saídas</H>
        <P>
          Ações, propaganda (paga adiantada), salários diários da equipe, pesquisas internas e
          multas.
        </P>
        <Tip tone="bad">Sem caixa para pagar a folha, a equipe vai embora.</Tip>
        <H>Equipe</H>
        <Table
          head={['Cargo', 'O que faz', 'Salário/dia (júnior, base)']}
          rows={STAFF_ROLE_IDS.map((id) => {
            const r = STAFF_ROLES[id];
            return [<b key="n">{r.name}</b>, r.description, formatMoney(r.dailySalary)];
          })}
        />
        <P>
          Níveis:{' '}
          {([1, 2, 3] as const)
            .map(
              (l) =>
                `${STAFF_LEVELS[l].name} (salário ×${n2(STAFF_LEVELS[l].salary)}, efeito ×${n2(STAFF_LEVELS[l].effect)})`,
            )
            .join(' · ')}
          . Contratar custa 5 dias de salário.
        </P>
        <H>Energia, entusiasmo e militantes</H>
        <Ul>
          <li>
            Energia regenera {C.energyRegenPerDay}/dia + até {C.energyRegenOrganizationBonus} pela
            organização (+
            {C.youngAgeEnergyBonus} se tiver menos de {C.youngAgeLimit} anos).
          </li>
          <li>
            Entusiasmo da base multiplica o efeito das ações (0,8 a 1,2), aumenta doações e o
            comparecimento dos seus eleitores. Tende a voltar a um valor que depende da união do seu
            partido.
          </li>
          <li>Militantes crescem com entusiasmo e potencializam o porta a porta.</li>
        </Ul>
      </>
    ),
  },
  {
    id: 'propostas',
    title: 'Propostas e promessas',
    icon: 'scroll',
    keywords: 'proposta promessa ideologia percebida tema ênfase facções credibilidade',
    body: () => (
      <>
        <P>Lançar uma proposta (ação ou resposta em entrevista):</P>
        <Ul>
          <li>
            aumenta sua ênfase no tema (+{C.proposalIssueFocus}) — conta para os grupos que
            priorizam esse tema;
          </li>
          <li>
            <b>desloca sua ideologia percebida</b> — aproxima de uns grupos e afasta de outros (a
            tela mostra quem tende a gostar e a desgostar);
          </li>
          <li>pode agradar ou irritar facções do seu partido (afeta a unidade partidária);</li>
          <li>
            vira <b>promessa</b>. Com mais de {C.promiseInflationThreshold} pendentes, cada nova
            custa {Math.abs(C.promiseInflationCredibility)} de credibilidade. No fim do mandato elas
            são cobradas.
          </li>
        </Ul>
        <Tip>
          Antes de lançar, olhe na prévia quais grupos gostam. Prefira propostas que aproximam você
          dos grupos grandes das regiões em que está perdendo — e que você consiga cumprir se
          eleito.
        </Tip>
      </>
    ),
  },
  {
    id: 'pesquisas',
    title: 'Pesquisas',
    icon: 'bar-chart-3',
    keywords: 'pesquisa instituto margem erro viés interna segmentos fiéis independentes mapa',
    body: () => (
      <>
        <P>
          Você nunca vê a intenção real — só pesquisas. As públicas saem a cada{' '}
          {GameConstants.polls.publicIntervalDays} dias (n ={' '}
          {GameConstants.polls.publicSampleSize.toLocaleString('pt-BR')}, margem ≈ ±2,4 p.p.) com
          viés próprio de cada instituto, fixo durante a partida. Recortes por região e grupo têm
          amostras menores e erram mais.
        </P>
        <P>
          A <b>pesquisa interna</b> é paga (o estatístico barateia e amplia a amostra) e mostra os
          segmentos do eleitorado:
        </P>
        <Ul>
          <li>
            <b>Fiéis</b> e <b>simpatizantes</b> — já votam em você.
          </li>
          <li>
            <b>Independentes</b> — votam em outro sem rejeitar você: <b>o seu alvo principal</b>.
          </li>
          <li>
            <b>Indecisos</b>, <b>anti-candidato</b> (te rejeitam) e <b>abstenção</b>.
          </li>
        </Ul>
        <Tip>
          O mapa colore pela pesquisa mais recente, não pela realidade. Desconfie de uma única
          pesquisa.
        </Tip>
      </>
    ),
  },
  {
    id: 'debates',
    title: 'Debates e entrevistas',
    icon: 'mic-vocal',
    keywords:
      'debate estratégia técnica popular agressiva conciliadora emocional evasiva entrevista resposta firme empática',
    body: () => (
      <>
        <H>Debates</H>
        <P>
          Só em eleições majoritárias, em datas fixas ({E.debateDaysBefore.join(', ')} dias antes do
          1º turno). São {GameConstants.debate.rounds} rodadas de pergunta, resposta, ataque,
          réplica e tréplica. O treinamento de mídia e o preparador de debates melhoram a nota.
          Recusar gera &ldquo;cadeira vazia&rdquo;: rejeição e perda de momentum.
        </P>
        <Table
          head={[
            'Estratégia',
            'Descrição',
            'Rejeição',
            'Entusiasmo',
            'Dano ao atacar',
            'Atributos',
          ]}
          rows={(Object.keys(STRATEGY_TEXT) as DebateStrategy[]).map((s) => {
            const p = STRATEGY_PROFILES[s];
            return [
              <b key="n">{STRATEGY_TEXT[s].name}</b>,
              STRATEGY_TEXT[s].description,
              p.rejection > 0 ? `+${p.rejection}` : p.rejection < 0 ? `${p.rejection}` : '—',
              p.enthusiasm > 0 ? `+${p.enthusiasm}` : p.enthusiasm < 0 ? `${p.enthusiasm}` : '—',
              `×${n2(p.damage)}`,
              attrList(p.attrs),
            ];
          })}
        />
        <H>Entrevistas</H>
        <P>
          {GameConstants.interview.questions} perguntas sobre os temas que mais importam ao
          eleitorado local; a última pode ser hostil (escândalos, promessas, crise do partido). A
          nota depende do estilo × seus atributos × contexto, e afeta conhecimento, o momentum dos
          grupos que consomem aquela mídia, rejeição e credibilidade.
        </P>
        <Table
          head={['Veículo', 'Alcance', 'Energia']}
          rows={INTERVIEW_TYPES.map((t) => [
            <b key="n">{INTERVIEW_TYPE_INFO[t].name}</b>,
            `×${n2(INTERVIEW_TYPE_INFO[t].reach)}`,
            INTERVIEW_TYPE_INFO[t].energy,
          ])}
        />
        <Ul>
          <li>
            <b>Firme</b> (oratória, credibilidade) e <b>empática</b> (carisma) são seguras com bons
            atributos; a empática bem dada reduz a rejeição.
          </li>
          <li>
            <b>Técnica</b> depende de experiência e gestão. <b>Promessa</b> rende mais com
            credibilidade alta — mas vira promessa e muda sua posição.
          </li>
          <li>
            <b>Ataque</b> é imprevisível e aumenta a rejeição. <b>Evasiva</b> é segura, mas custa
            credibilidade.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'eventos',
    title: 'Eventos, notícias e adversários',
    icon: 'newspaper',
    keywords: 'evento escândalo crise notícia alerta adversário ataque memória',
    body: () => (
      <>
        <P>
          Eventos surgem conforme a fase e o contexto (economia, partido, escândalos, região). Cada
          opção tem efeitos visíveis na prévia; alguns eventos se encadeiam semanas depois (ex.:
          doação suspeita → investigação).
        </P>
        <P>
          Os <b>adversários</b> fazem campanha todos os dias: ganham conhecimento, presença nas
          regiões-foco e momentum nos grupos prioritários do partido deles. Eles atacam quem lidera
          — ou você, se estiver crescendo.
        </P>
        <Tip>
          Na tela{' '}
          <Link to="/jogo/impacto" className="underline">
            Impacto
          </Link>
          , a linha &ldquo;Campanha dos adversários&rdquo; mostra quanto você perde por dia sem
          fazer nada. É o ritmo mínimo que suas ações precisam superar.
        </Tip>
      </>
    ),
  },
  {
    id: 'eleicao',
    title: 'O dia da eleição',
    icon: 'vote',
    keywords: 'eleição urna segundo turno proporcional dhondt cadeiras choque surpresa',
    body: () => (
      <>
        <Ul>
          <li>
            Choques aleatórios na utilidade: nacional (±{n2(E.nationalSwingSd * 100)}%), regional (±
            {n2(E.regionalSwingSd * 100)}%) e por grupo (±{n2(E.popSwingSd * 100)}%). Uma vantagem
            pequena pode virar.
          </li>
          <li>
            O comparecimento tem ruído; o entusiasmo da sua base leva mais eleitores seus às urnas.
          </li>
          <li>
            Majoritária: mais de {pctNum(E.runoffThreshold)} dos válidos vence; senão, 2º turno
            entre os dois primeiros (exceto Senado, turno único).
          </li>
          <li>
            Proporcional (vereador, deputados): cadeiras por partido pelo método D&apos;Hondt; você
            precisa ficar entre os mais votados do seu partido. A tela mostra a linha de corte.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'mandato',
    title: 'Governando',
    icon: 'landmark',
    keywords:
      'governo mandato orçamento leis congresso aprovação capital político estabilidade ministros economia grupos de interesse',
    body: () => (
      <>
        <P>
          No Executivo você recebe orçamento, capital político, estabilidade, ministros/secretários
          e um Legislativo formado pela força dos partidos. O tempo passa em meses.
        </P>
        <Ul>
          <li>
            <b>Aprovação</b> = satisfação média dos grupos governados + lua de mel (6 meses) −
            escândalos − déficit.
          </li>
          <li>
            <b>Satisfação</b> de cada grupo = economia (desemprego, inflação, crescimento) +
            qualidade dos serviços nos temas prioritários (gasto × gestão) + efeitos e alinhamento
            das leis.
          </li>
          <li>
            <b>Leis</b> tramitam de verdade: comissões, relator, pauta do presidente da casa,
            plenário da Câmara e do Senado, sanção ou veto. Cada parlamentar vota conforme partido,
            bancada temática, ideologia, coalizão, emendas, concessões e pressão popular (veja
            “Congresso e tramitação”).
          </li>
          <li>
            <b>Negociação</b>: reuniões (gastam capital político), oferecer pastas (o partido entra
            na base), liberar emendas (custa orçamento), concessões (enfraquecem a lei) e
            mobilização pública.
          </li>
          <li>
            Mandato legislativo: o Executivo envia projetos e você vota (fidelidade partidária,
            grupos e eleitores reagem); também pode propor projetos.
          </li>
        </Ul>
        <Tip>
          A aprovação vira <b>voto retrospectivo</b> na reeleição. Cumprir promessas aumenta
          credibilidade, que pesa no apelo pessoal e reduz a rejeição.
        </Tip>
      </>
    ),
  },
  {
    id: 'economia',
    title: 'Economia real: mercado e indústria',
    icon: 'factory',
    keywords:
      'economia mercado preço oferta demanda indústria fábrica edifício construção obra investimento comércio exportação importação tarifa câmbio estatal privada cooperativa',
    body: () => (
      <>
        <P>
          O país tem uma economia de verdade: 31 tipos de edifício (fazendas, minas, campos de
          petróleo, siderúrgicas, montadoras, polos de tecnologia, bancos, hospitais…) espalhados
          pelos 27 estados. Cada edifício contrata Pops, compra insumos e vende o que produz num
          mercado nacional.
        </P>
        <Ul>
          <li>
            <b>Mercado</b>: cada bem tem preço relativo (1,00 = base). Escassez encarece o bem e trava
            quem depende dele; excedente derruba o preço. Bens comerciáveis seguem o preço mundial,
            mais tarifa e câmbio.
          </li>
          <li>
            <b>Propriedade</b>: privada, estatal, cooperativa ou estrangeira. Quem é dono decide o
            método de produção, fica com o lucro e investe. Leis estatizam, privatizam ou criam
            cooperativas aos poucos.
          </li>
          <li>
            <b>Investimento</b>: empresários, capital estrangeiro e o fundo estatal escolhem onde
            construir pela rentabilidade esperada. Juros, impostos, crédito subsidiado e tarifas
            mudam essa conta. A construção civil limita quantas obras andam por mês.
          </li>
          <li>
            <b>Governo como investidor</b>: no Executivo você manda construir (Indústria e obras ou
            painel do estado) e, sob leis desenvolvimentistas ou planificadas, define o plano nacional
            de investimento por setor.
          </li>
          <li>
            <b>Comércio exterior</b>: saldo comercial mexe no câmbio; real fraco protege a indústria e
            pressiona a inflação. Substituição de importações, protecionismo ou livre comércio mudam
            tarifas por categoria de bem.
          </li>
        </Ul>
        <Tip>
          Industrializar é lento: obras levam meses, fábricas precisam de aço, máquinas e energia, e
          proteger demais encarece tudo para quem consome. Olhe o Mercado antes de mudar a lei.
        </Tip>
      </>
    ),
  },
  {
    id: 'leis',
    title: 'Leis e sistemas: do liberalismo ao socialismo',
    icon: 'scale',
    keywords:
      'leis sistema econômico liberal capitalismo socialismo comunismo planificada desenvolvimentista regime parlamentarismo instrumento pec plp mp plebiscito bandeiras plataforma',
    body: () => (
      <>
        <P>
          Como no Victoria 3, o país é definido por categorias de lei (sistema econômico, comércio,
          trabalho, tributação, sistema financeiro, sindicatos, regime de governo…). Cada opção tem
          efeitos concretos no motor econômico, nos Pops, nos grupos de interesse e nas bancadas.
        </P>
        <Ul>
          <li>
            <b>Sistema econômico</b>: laissez-faire, economia mista, desenvolvimentismo, socialismo
            democrático e economia planificada. Os extremos exigem PEC e, às vezes, plebiscito.
          </li>
          <li>
            <b>Instrumento</b>: projeto de lei (maioria simples), lei complementar (maioria absoluta),
            emenda constitucional (3/5 em dois turnos nas duas casas) ou medida provisória (só o
            Presidente; vale na hora e cai em 120 dias se o Congresso não aprovar).
          </li>
          <li>
            Depois de aprovada, a lei leva meses para ser implementada; concessões feitas na
            negociação reduzem sua força.
          </li>
          <li>
            Mudar o regime (parlamentarismo, semipresidencialismo, partido único) muda quem governa e
            como o governo cai.
          </li>
          <li>
            <b>Promessas</b>: uma promessa de lei vira “Cumprida” assim que a lei é aprovada no seu mandato, seja quem
            for o autor. Promessa de lei de outra esfera (ex.: prefeito prometendo lei federal) conta quando a outra esfera
            aprova, valendo menos credibilidade. Se a lei for revogada depois, é recuo e custa credibilidade.
          </li>
          <li>
            <b>Bandeiras</b>: na criação do personagem (e ao fundar um partido) você escolhe até 8 leis
            que defende. Eleitores que ganham com elas gostam mais de você, os que perdem gostam menos;
            grupos de interesse reagem; partidos votam pelas próprias bandeiras no Congresso. No governo,
            propor uma bandeira sua dá credibilidade, e propor o contrário é incoerência. Trocar de
            bandeira depois (ficha do Candidato) custa credibilidade.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'congresso',
    title: 'Congresso e tramitação',
    icon: 'building-2',
    keywords:
      'congresso câmara senado comissão relator pauta presidente da casa engavetar urgência sanção veto derrubar bancada ruralista evangélica sindical impeachment voto deputado manobra obstrução vista destaque emenda vereador',
    body: () => (
      <>
        <Ul>
          <li>
            <b>Comissões e relator</b>: o presidente da casa designa um relator, cujo parecer pesa
            no plenário. Converse com ele (capital político) ou, se o relator for você, decida o
            parecer.
          </li>
          <li>
            <b>Pauta</b>: o presidente da casa decide quando votar — e pode engavetar projetos de quem
            ele não gosta. Negocie a pauta, peça urgência ou dispute a eleição da mesa.
          </li>
          <li>
            <b>Votação</b>: cada partido se divide por bancadas temáticas (ruralista, evangélica,
            sindical, empresarial…). A projeção mostra quantos votos você tem em cada casa.
          </li>
          <li>
            <b>Sanção e veto</b>: o Executivo sanciona ou veta; o Congresso pode derrubar o veto por
            maioria absoluta. PEC é promulgada sem sanção.
          </li>
          <li>
            <b>Como parlamentar</b>, o tempo para no dia das votações da sua casa até você votar.
            Fidelidade ao governo libera emendas; votar contra o partido irrita a liderança.
          </li>
          <li>
            <b>Impeachment</b>: com legitimidade e aprovação baixas e base fraca, o Congresso pode abrir
            processo (2/3 da Câmara) e condenar (2/3 do Senado). No parlamentarismo, a ameaça é a
            moção de desconfiança.
          </li>
        </Ul>
        <H>Manobras regimentais</H>
        <P>
          Discorda de um projeto? Na ficha da proposição (Congresso) ou na janela de votação, use as
          manobras — vale na Câmara Municipal, na Assembleia, na Câmara dos Deputados e no Senado. Como
          chefe do Executivo, você manobra pelo líder do governo (custa um pouco mais).
        </P>
        <Ul>
          <li><b>Pedido de vista</b> (comissão): adia o parecer em 14 dias.</li>
          <li><b>Obstrução</b> (plenário): adia a votação em 10 dias; funciona melhor quanto mais gente estiver contra.</li>
          <li><b>Retirada de pauta</b>: o plenário vota; se passar, o projeto sai da pauta por 45 dias.</li>
          <li><b>Emenda substitutiva</b>: troca o texto por uma versão mais branda, mais perto da lei atual.</li>
          <li><b>Destaque (DVS)</b>: derruba trechos — se a lei passar, passa mais fraca.</li>
          <li><b>Articular votos contra</b>: negocia com um partido para votar contra.</li>
          <li><b>Engavetar</b>: acordo com o presidente da casa (ou ordem sua, se você preside).</li>
        </Ul>
        <Tip>A oposição também manobra: projetos seus com muita gente contra podem sofrer obstrução e pedidos de vista. Urgência protege contra isso.</Tip>
        <Tip>O Congresso também propõe leis sozinho: bancadas e partidos apresentam projetos o tempo todo.</Tip>
      </>
    ),
  },
  {
    id: 'obras',
    title: 'Obras públicas e emprego',
    icon: 'hard-hat',
    keywords: 'obras públicas prefeitura governo estadual federal creche ubs hospital rodovia metrô distrito polo industrial emprego desemprego inauguração',
    body: () => (
      <>
        <P>
          Cada esfera tem as suas obras: a prefeitura faz creches, postos de saúde, saneamento, asfalto, moradia, BRT e
          distrito industrial; o governo estadual faz hospitais regionais, escolas técnicas, rodovias, segurança, metrô e
          polos industriais; a União faz ferrovias, universidades, portos e programas nacionais de moradia.
        </P>
        <Ul>
          <li>
            <b>Emprego</b>: enquanto anda, a obra contrata trabalhadores da construção (cerca de 12 mil por R$ 1 bi/ano) e gera
            empregos indiretos no comércio e serviços. Ao inaugurar, deixa empregos permanentes. Fábricas e empresas que você
            manda construir também empregam durante a obra.
          </li>
          <li>
            <b>Serviços</b>: obras concluídas melhoram a qualidade do serviço da sua esfera (saúde, educação, transporte…),
            o que agrada quem prioriza o tema.
          </li>
          <li>
            <b>Indústria</b>: prefeituras não abrem fábricas — o distrito industrial atrai empresas privadas. Governos
            estaduais e a União podem fazer polos industriais e também mandar construir edifícios.
          </li>
          <li>
            <b>Dinheiro</b>: a obra é paga pelo orçamento da sua esfera ao longo do prazo (até 30% da receita por ano em
            obras). Com o caixa muito negativo, as obras param — e a imprensa nota.
          </li>
          <li>A tela Obras separa as suas obras, as de outros governos no seu lugar e as do país.</li>
        </Ul>
      </>
    ),
  },
  {
    id: 'ruas',
    title: 'Clima nas ruas e revolta popular',
    icon: 'flame',
    keywords: 'revolta protestos manifestações greve geral ocupações bloqueios repressão negociação cassação impeachment ruas',
    body: () => (
      <>
        <P>
          O lugar que você governa tem uma temperatura nas ruas. Ela sobe com desemprego, inflação, serviços ruins,
          promessas não cumpridas, escândalos e impopularidade, e cai com emprego, obras entregues e diálogo. O Gabinete
          mostra cada causa e a pauta dos manifestantes.
        </P>
        <Ul>
          <li>
            <b>Escada</b>: Calma → Insatisfação → Protestos → Grandes manifestações → Ocupações e bloqueios → Greve geral →
            Revolta. Sobe no máximo um degrau por mês, e cada degrau custa aprovação, capital político, legitimidade e
            confiança na economia.
          </li>
          <li>
            <b>Respostas</b>: pronunciamento, mesa de negociação, atender a pauta, reprimir (acalma na hora, mas radicaliza e
            pode sair pela culatra) e, só para o presidente, estado de emergência.
          </li>
          <li>
            <b>No topo</b>: o presidente enfrenta impeachment; governadores e prefeitos, uma votação de cassação na
            Assembleia ou na Câmara Municipal (2/3). Ruas mais calmas e base fiel salvam o mandato.
          </li>
        </Ul>
        <Tip>As respostas só ganham tempo. O jeito duradouro de acalmar as ruas é resolver as causas.</Tip>
      </>
    ),
  },
  {
    id: 'decretos',
    title: 'Decretos do Executivo',
    icon: 'scroll-text',
    keywords: 'decreto tarifa subsídio congelar preços selic desapropriar privatizar stf calamidade plano',
    body: () => (
      <>
        <P>
          Decretos têm efeito imediato e não passam pelo Congresso: tarifas temporárias, subsídios,
          congelamento de preços, proibição de exportar, crédito de bancos públicos, desapropriação
          ou privatização de uma fatia de um edifício, entre outros.
        </P>
        <Ul>
          <li>Cada decreto custa capital político e há um limite de decretos ativos.</li>
          <li>
            Quando o decreto vai além do que as leis permitem, o STF pode suspendê-lo — o risco
            aparece em cada decreto ativo.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'nacao',
    title: 'Nação, legitimidade e grupos',
    icon: 'shield',
    keywords: 'nação regime legitimidade inquietação greve grupos de interesse peso político radicalismo objetivos',
    body: () => (
      <>
        <Ul>
          <li>
            <b>Legitimidade</b> mede a aceitação do regime e das instituições. Rupturas bruscas e
            crises a derrubam; legitimidade baixa abre caminho para greves e impeachment.
          </li>
          <li>
            <b>Grupos de interesse</b> têm peso político que muda com a economia: industrializar
            fortalece sindicatos e industriais; o agro forte fortalece os ruralistas.
          </li>
          <li>
            Grupos insatisfeitos se radicalizam e podem entrar em <b>greve</b>, derrubando a
            produção de um setor por meses.
          </li>
          <li>
            O nome oficial e a identidade do país mudam com o sistema que você constrói.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'carreira',
    title: 'Partido e carreira',
    icon: 'award',
    keywords: 'partido facções unidade trocar fundar carreira aposentar sabático reeleição',
    body: () => (
      <>
        <Ul>
          <li>
            Seu partido tem facções com satisfação própria. A <b>unidade</b> é a média delas e reage
            à sua posição percebida — e influencia o entusiasmo da base.
          </li>
          <li>
            Trocar de partido custa credibilidade. Fundar um partido: nasce pequeno, mas 100%
            alinhado a você.
          </li>
          <li>
            Ao fim do mandato: concorrer a outro cargo, à reeleição (máx. 2 mandatos seguidos no
            Executivo), tirar um ano sabático ou se aposentar. A fama cai fora do cargo.
          </li>
        </Ul>
      </>
    ),
  },
  {
    id: 'atributos',
    title: 'Atributos do candidato',
    icon: 'smile',
    keywords:
      'atributos carisma oratória liderança negociação credibilidade comunicação gestão experiência popularidade organização',
    body: () => (
      <Table
        head={['Atributo', 'Para que serve']}
        rows={Object.values(ATTRIBUTES).map((a) => [
          <span key="n" className="flex items-center gap-1 font-bold">
            <Icon name={a.icon} size={13} className="text-gold-400" />
            {a.name}
          </span>,
          a.description,
        ])}
      />
    ),
  },
  {
    id: 'impacto',
    title: 'Medidor de impacto',
    icon: 'activity',
    keywords: 'impacto medidor quanto rendeu efeito ação variação pontos percentuais',
    body: () => (
      <>
        <P>
          A tela{' '}
          <Link to="/jogo/impacto" className="font-bold text-gold-400 underline">
            Impacto
          </Link>{' '}
          mostra quanto cada coisa mexeu na sua situação, em <b>pontos percentuais (p.p.)</b>. A
          medição é feita pela sua equipe no modelo de voto,{' '}
          <b>sem a margem de erro das pesquisas</b>: a intenção é calculada imediatamente antes e
          depois de cada mudança.
        </P>
        <Table
          head={['Fonte', 'O que mede']}
          rows={[
            [
              'Ações de campanha',
              'Efeito imediato de cada ação (antes de o tempo passar), incluindo gafes.',
            ],
            ['Propaganda paga', 'O efeito de cada peça em cada dia no ar.'],
            ['Debates / Entrevistas', 'A soma de todas as respostas e do resultado final.'],
            ['Eventos', 'Suas decisões em eventos e os efeitos em andamento (modificadores).'],
            ['Adversários', 'O que as campanhas dos outros candidatos tiraram (ou deram) a você.'],
            ['Desgaste natural', 'Presença e momentum de todos os candidatos caindo a cada dia.'],
            ['Horário eleitoral gratuito', 'Conhecimento distribuído nos últimos 35 dias.'],
            [
              'Passagem do tempo e outros',
              'Indecisos diminuindo, economia, popularidade e partidos.',
            ],
          ]}
        />
        <Ul>
          <li>
            <b>Intenção</b> = % sobre quem comparece (como nas pesquisas). <b>Válidos</b> = só votos
            em candidatos. <b>Rejeição</b>: aqui, negativo é bom.
          </li>
          <li>
            O ganho de uma ação é o imediato. Como presença e momentum se desgastam, parte dele vai
            sumir nos dias seguintes — isso aparece em &ldquo;Desgaste natural&rdquo;.
          </li>
          <li>
            A tabela de <b>custo-benefício</b> compara ações e canais por uso e por R$ 100 mil
            gastos: use-a para descobrir o que funciona para o seu candidato e o seu eleitorado.
          </li>
          <li>Os efeitos também aparecem na notificação de cada ação e no diário de campanha.</li>
        </Ul>
      </>
    ),
  },
  {
    id: 'estrategia',
    title: 'Estratégia: guia rápido',
    icon: 'lightbulb',
    keywords: 'dicas estratégia guia como ganhar',
    body: () => (
      <>
        <H>Começo da campanha (primeiro terço)</H>
        <Ul>
          <li>
            Conhecimento acima de tudo: TV, redes, caravanas e campanha intensiva nas regiões mais
            populosas.
          </li>
          <li>Contrate cedo o coordenador (multiplica tudo) e o captador (paga a equipe).</li>
          <li>
            Lance 2 ou 3 propostas que aproximem você dos grupos grandes; evite posições extremas.
          </li>
        </Ul>
        <H>Meio</H>
        <Ul>
          <li>
            Faça uma pesquisa interna e mire nos <b>independentes</b> e nas regiões em que perde por
            pouco.
          </li>
          <li>Coloque propaganda segmentada nos grupos com mais independentes.</li>
          <li>Prepare-se para os debates (treinamento de mídia na véspera).</li>
        </Ul>
        <H>Reta final (últimas 2–3 semanas)</H>
        <Ul>
          <li>Presença e momentum agora: eles não terão tempo de se desgastar.</li>
          <li>
            Comícios e porta a porta nas regiões decisivas; mantenha o entusiasmo alto
            (comparecimento).
          </li>
          <li>
            Ataque só se estiver atrás e o alvo for o rival direto — e acompanhe a sua rejeição.
          </li>
        </Ul>
        <H>Dificuldades</H>
        <Table
          head={['', 'Recursos', 'Custos', 'Volatilidade', 'Eventos', 'Adversários', 'Incerteza']}
          rows={DIFFICULTY_IDS.map((id) => {
            const d = DIFFICULTIES[id];
            return [
              <b key="n">{d.name}</b>,
              `×${n2(d.resources)}`,
              `×${n2(d.costs)}`,
              `×${n2(d.volatility)}`,
              `×${n2(d.eventRate)}`,
              `×${n2(d.opponentStrength)}`,
              `×${n2(d.uncertainty)}`,
            ];
          })}
        />
      </>
    ),
  },
];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function ManualContent({ game }: { game: GameState | null }) {
  const [query, setQuery] = useState('');
  const location = useLocation();
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SECTIONS;
    return SECTIONS.filter((s) => normalize(`${s.title} ${s.keywords}`).includes(q));
  }, [query]);

  useEffect(() => {
    const id = location.hash.slice(1);
    if (!id) return;
    document.getElementById(`manual-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const jump = (id: string) =>
    document.getElementById(`manual-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="@2xl:sticky @2xl:top-0 @2xl:self-start">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar no manual…"
          className="game-select mb-2 w-full"
          aria-label="Buscar no manual"
        />
        <nav
          className="flex gap-1 overflow-x-auto pb-1 @2xl:flex-col @2xl:overflow-visible"
          aria-label="Seções do manual"
        >
          {visible.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(s.id)}
              className="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1 text-left text-sm text-paper/85 hover:bg-ink-700"
            >
              <Icon name={s.icon} size={14} className="text-gold-400" />
              {s.title}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-3">
        {visible.length === 0 && (
          <p className="text-sm text-muted">Nada encontrado para &ldquo;{query}&rdquo;.</p>
        )}
        {visible.map((s) => (
          <div key={s.id} id={`manual-${s.id}`} className="scroll-mt-2">
            <Panel title={s.title} icon={s.icon}>
              <div className="space-y-2.5">{s.body(game)}</div>
            </Panel>
          </div>
        ))}
        <p className="flex items-center gap-2 text-xs text-muted">
          <Badge tone="info">dica</Badge> Os números deste manual vêm direto do motor do jogo e
          mudam se o jogo for rebalanceado.
        </p>
      </div>
    </div>
  );
}

/** Manual dentro da partida (/jogo/manual). */
export function ManualView() {
  const game = useGame((s) => s.game);
  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-display text-2xl font-semibold">Manual do jogo</h1>
        <p className="text-sm text-muted">Como cada sistema funciona e como tirar o máximo dele.</p>
      </div>
      <ManualContent game={game} />
    </div>
  );
}

/** Manual acessível pelo menu principal (/manual). */
export function ManualPage() {
  return (
    <PageShell
      title="Manual do jogo"
      subtitle="Como cada sistema funciona e como tirar o máximo dele."
    >
      <ManualContent game={null} />
    </PageShell>
  );
}
