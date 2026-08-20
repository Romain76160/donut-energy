# Donut Energy

Première brique d'un outil web de simulation thermique dynamique : la modélisation des murs du bâtiment.

## Fonctionnalités disponibles

- plan 2D interactif avec sélection des murs ;
- tracé d'un nouveau mur par deux clics, avec accrochage tous les 50 cm ;
- édition du nom, de la longueur, de la hauteur et de l'orientation ;
- composition multicouche et bibliothèque de matériaux ;
- calcul immédiat de la résistance thermique `R`, du coefficient `U` et des surfaces ;
- annulation, rétablissement, zoom et sauvegarde locale dans le navigateur ;
- interface adaptée aux écrans de bureau et mobiles.

Les calculs de paroi suivent `R = Rsi + Σ(e/λ) + Rse`, avec `Rsi = 0,13 m²·K/W` et `Rse = 0,04 m²·K/W`.

## Développement

```bash
npm install
npm run dev
```

Vérifications :

```bash
npm test
npm run build
```

## Périmètre actuel

Cette version traite uniquement les murs. Les ouvertures, planchers, toitures, zones thermiques, scénarios d'usage et calculs dynamiques seront ajoutés dans de futures étapes.

<!-- deployment trigger: 2026-08-20T12:02Z -->
