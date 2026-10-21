// LOOK 30 — the centrepiece.
// Identification: file img/Look_30.jpg (filename = runway number), position 30 in the
// sequence, and visual cross-check: the same pink metallic silhouette is visible in the
// background of img/Look_29.jpg, while the cream gown of Look 29 appears in the
// background of img/Look_30.jpg (the two passages cross).
//
// Boxes and points are in pixels of the 1080 × 1440 original.
// `obs` = what is visible. `int` = artistic interpretation (explicitly labelled as such).
(() => {
  'use strict';

  const LOOK30 = {
    n: 30,
    file: 'img/Look_30.jpg',
    w: 1080,
    h: 1440,
    roomTitle: 'Le reflet tenu',
    // where the silhouette of Look 30 appears inside Look_29.jpg (background)
    ghostIn29: [150, 210, 420, 980],
    details: [
      {
        id: '30.1', label: 'Masque', box: [430, 30, 660, 300], pt: [545, 140],
        obs: "Le visage est entièrement recouvert d'une surface rose métallique qui se prolonge jusqu'au cou.",
        int: "Le visage devient miroir : on ne regarde plus quelqu'un, on regarde ce qui se reflète sur lui.",
      },
      {
        id: '30.2', label: 'Col', box: [420, 190, 680, 390], pt: [548, 262],
        obs: "Un col montant, drapé en plis horizontaux, relie le masque au corsage sans rupture visible.",
        int: "Aucune frontière entre la tête et le vêtement : la silhouette est d'un seul tenant.",
      },
      {
        id: '30.3', label: 'Corsage', box: [380, 260, 740, 620], pt: [560, 430],
        obs: "Le corsage est froissé en plis serrés et irréguliers qui accrochent la lumière.",
        int: "La matière semble avoir été comprimée puis relâchée — un pli qui garde la mémoire d'un geste.",
      },
      {
        id: '30.4', label: 'Manche', box: [330, 540, 530, 800], pt: [415, 690],
        obs: "La manche descend jusque dans les plis du bas de la robe ; aucune main, aucune peau n'est visible.",
        int: "Le corps disparaît dans le drapé : le vêtement absorbe celle qui le porte.",
      },
      {
        id: '30.5', label: 'Hanches', box: [400, 560, 740, 860], pt: [565, 705],
        obs: "Aux hanches, le tissu est rassemblé en volumes froncés avant de tomber vers le sol.",
        int: "Un nœud de matière, comme un vêtement réassemblé à partir d'un autre.",
      },
      {
        id: '30.6', label: 'Traîne', box: [300, 1040, 880, 1440], pt: [600, 1290],
        obs: "Le bas de la robe touche le béton ; ses reflets passent du rose pâle au bordeaux.",
        int: "La lumière fait le travail de la couleur : la robe change à chaque pas.",
      },
      {
        id: '30.7', label: 'Arrière-plan', box: [880, 300, 1075, 630], pt: [985, 470],
        obs: "Au fond à droite, une silhouette en robe crème s'éloigne ; elle correspond visuellement au Look 29.",
        int: "Le passage précédent persiste au bord du cadre — une after-image au sens propre.",
      },
    ],
  };

  /** Transform (fractions of the frame) that frames `box` inside a 3:4 frame. */
  function frameFor(box, w = 1080, h = 1440, maxScale = 4.2) {
    const [x0, y0, x1, y1] = box;
    const bw = (x1 - x0) / w;
    const bh = (y1 - y0) / h;
    const s = Math.min(maxScale, Math.max(1, Math.min(1 / bw, 1 / bh) * 0.92));
    const cx = (x0 + x1) / 2 / w;
    const cy = (y0 + y1) / 2 / h;
    const tx = Math.min(0, Math.max(1 - s, 0.5 - cx * s));
    const ty = Math.min(0, Math.max(1 - s, 0.5 - cy * s));
    return { s, tx, ty };
  }

  /** CSS background values that show `box` of an image inside an element of the box's aspect. */
  function cropBackground(box, w = 1080, h = 1440) {
    const [x0, y0, x1, y1] = box;
    const bw = x1 - x0;
    const bh = y1 - y0;
    const size = `${(w / bw) * 100}% ${(h / bh) * 100}%`;
    const px = w - bw === 0 ? 0 : (x0 / (w - bw)) * 100;
    const py = h - bh === 0 ? 0 : (y0 / (h - bh)) * 100;
    return { size, position: `${px}% ${py}%`, ratio: `${bw} / ${bh}` };
  }

  AFTERIMAGE['data/look30'] = { LOOK30, frameFor, cropBackground };
})();
