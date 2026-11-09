// Výchozí sada receptů pro novou domácnost (suroviny pro 2 porce).
// Recepty od vlastníka + recepty od Páji. Suroviny: [název, množství] nebo 'Název|množství'.
let nextId = 1;
const ing = (g) => {
  if (Array.isArray(g)) return { name: g[0], amount: g[1] };
  const [n, a] = g.split('|');
  return { name: n, amount: a || '' };
};
const r = (name, emoji, type, preparation, ingredients, instructions) => ({
  id: nextId++,
  name,
  image: null,
  emoji,
  ingredients: ingredients.map(ing),
  instructions,
  type,
  preparation,
});

const MealsList = [
  // ===== SNÍDANĚ =====
  r('Avokádový toust', '🥑', 'breakfast', 'Bez vaření', [
    ['Chléb celozrnný', '4 plátky'], ['Avokádo', '1 ks'], ['Citron', '½ ks'], ['Cherry rajčata', '6 ks'], ['Sůl, pepř', 'dle chuti'],
  ], 'Chleba opečeme v toustovači. Avokádo rozmačkáme s citronovou šťávou, solí a pepřem, namažeme na toust a doplníme půlkami rajčat.'),
  r('Smažená vajíčka se šunkou v tortille', '🌯', 'breakfast', 'Smažení', [
    ['Tortilla pšeničná', '2 ks'], ['Vejce', '4 ks'], ['Šunka', '4 plátky'], ['Eidam plátkový', '2 plátky'], ['Olej', '1 lžíce'],
  ], 'Na pánvi usmažíme vajíčka (míchaná nebo volské oko) a šunku. Tortillu krátce ohřejeme, vložíme sýr, šunku a vajíčka a pevně zabalíme. Varianta od Páji: vejce rozlijeme na pánev, přiložíme na něj tortillu, otočíme a doplníme podle chuti zeleninou, šunkou nebo sýrem.'),
  r('Jogurt s borůvkami / banánem', '🥛', 'breakfast', 'Bez vaření', [
    ['Řecký jogurt', '300 g'], ['Borůvky', '100 g'], ['Banán', '1 ks'], ['Med', '2 lžičky'], ['Ovesné vločky', '4 lžíce'],
  ], 'Jogurt (ideálně s 0 % tuku) rozdělíme do misek, přidáme borůvky nebo nakrájený banán (může být i jiné ovoce), vločky a pokapeme medem.'),
  r('Croissant se šunkou, sýrem a salátem', '🥐', 'breakfast', 'Bez vaření', [
    ['Croissant', '2 ks'], ['Šunka', '4 plátky'], ['Eidam plátkový', '2 plátky'], ['Salát ledový', '4 listy'], ['Rajčata', '1 ks'],
  ], 'Croissanty podélně rozkrojíme, případně krátce ohřejeme. Naplníme šunkou, sýrem, salátem a plátky rajčete.'),
  r('Proteinové slané palačinky', '🥞', 'breakfast', 'Smažení', [
    ['Vejce', '3 ks'], ['Ovesné vločky', '60 g'], ['Cottage cheese', '150 g'], ['Šunka', '4 plátky'], ['Pažitka', '1 hrst'],
  ], 'Vejce, vločky a cottage rozmixujeme na hladké těsto. Pečeme na pánvi z obou stran a plníme šunkou a pažitkou. Varianta od Páji: klasické těsto z mouky, mléka a vajec se slanými přísadami (šunka, sýr, zelenina), smažit na pánvi nebo zapéct ve vaflovači.'),
  r('Omeleta', '🍳', 'breakfast', 'Smažení', [
    ['Vejce', '4 ks'], ['Eidam plátkový', '2 plátky'], ['Paprika', '½ ks'], ['Šunka', '2 plátky'], ['Máslo', '1 lžička'],
  ], 'Vejce rozšleháme se solí. Na másle nalijeme na pánev, přidáme nakrájenou papriku, šunku a sýr a přeložíme. Zdravá varianta od Páji: jen 3 bílky s kořením, kvalitní šunka a ideálně špenát a žampiony.'),

  // Snídaně od Páji
  r('Ranní ovesné vločky přes noc', '🥣', 'breakfast', 'Bez vaření', [
    'Ovesné vločky|6 lžic', 'Chia semínka|2 lžíce', 'Jahody|150 g', 'Banán|1 ks', 'Bílý jogurt|250 g',
  ], 'Vločky smícháme s chia semínky, rozmačkanými jahodami nebo banánem (může být i jiné ovoce) a bílým jogurtem. Necháme přes noc v lednici.'),
  r('Jahodové palačinky', '🍓', 'breakfast', 'Mixování + smažení', [
    'Jahody|500 g', 'Vejce|1 ks', 'Mléko|200 ml', 'Mouka hladká|100 g', 'Cukr|1 lžíce', 'Sůl|1 špetka', 'Olej|2 lžíce',
  ], 'Jahody, vejce a mléko rozmixujeme. Přidáme mouku, sůl, cukr a trochu oleje a zamícháme na těsto. Palačinky pečeme na pánvi.'),
  r('Vejce Benedikt z formiček', '🥚', 'breakfast', 'Vaření', [
    'Vejce|4 ks', 'Máslo|1 lžička',
  ], 'Vejce rozklepneme do formiček na pečení vymazaných máslem. Formičky vložíme do vody a necháme asi 6 minut vařit.'),
  r('Mrkvové palačinky', '🥕', 'breakfast', 'Smažení', [
    'Mrkev|2 ks', 'Vejce|2 ks', 'Bílý řecký jogurt|100 g', 'Mouka hladká|60 g', 'Mléko|100 ml', 'Sůl|1 špetka', 'Olej|1 lžíce',
  ], 'Mrkev nastrouháme najemno, přidáme vejce, bílý řecký jogurt, mouku, sůl a mléko a vše promixujeme. Palačinky smažíme na pánvi.'),
  r('Banánové lívance s pudinkem', '🍌', 'breakfast', 'Smažení', [
    'Proteinový pudink vanilkový|1 sáček', 'Banán|1 ks', 'Vejce|1 ks', 'Mouka hladká|3 lžíce', 'Olej|1 lžíce',
  ], 'Proteinový pudink (vanilka) smícháme s rozmačkaným banánem, vejcem a moukou. Z těsta děláme lívance na pánvi.'),
  r('Banánové lívance s jogurtem', '🍌', 'breakfast', 'Smažení', [
    'Banán zralý|1 ks', 'Řecký jogurt|140 g', 'Vejce|1 ks', 'Mouka hladká|3 lžíce', 'Protein|1 odměrka', 'Olej|1 lžíce',
  ], 'Smícháme zralý rozmačkaný banán, 140 g řeckého jogurtu, vejce, trochu mouky a protein a dochutíme. Lívance smažíme na pánvi.'),
  r('Banánové lívanečky z bílků', '🍌', 'breakfast', 'Smažení', [
    'Vaječné bílky|3 ks', 'Ořechové máslo|1 lžíce', 'Banán|1 ks', 'Skořice|1 lžička', 'Kypřící prášek|1 lžička', 'Olej|1 lžička',
  ], 'Rozmícháme bílky, ořechové máslo, banán a skořici, podle potřeby přidáme kypřící prášek. Palačinky nebo lívanečky děláme na pánvi s malým množstvím oleje.'),
  r('Cottage lívance s ovesnými vločkami', '🥞', 'breakfast', 'Mixování + smažení', [
    'Cottage sýr|200 g', 'Vejce|2 ks', 'Ovesné vločky|6 lžic', 'Kakao|1 lžíce', 'Voda|2 lžíce', 'Sůl|1 špetka', 'Olej|1 lžíce',
  ], 'Cottage, vejce a ovesné vločky rozmixujeme na těsto (kdo chce, přidá kakao, případně trochu vody a sůl). Těsto může být slané i sladké. Smažíme na pánvi jako lívance nebo placky. Na placky: 200 g cottage, 2 vejce, 4 lžíce vloček, 50 ml vody a sůl.'),
  r('Kakaové lívance s cottage', '🍫', 'breakfast', 'Mixování + smažení', [
    'Vejce|2 ks', 'Cottage sýr|200 g', 'Ovesné vločky|4 lžíce', 'Prášek do pečiva|1 lžička', 'Kakao|1 lžíce', 'Med|1 lžíce', 'Borůvky|50 g', 'Olej|1 lžíce',
  ], 'Vejce, cottage, vločky, prášek do pečiva a kakao rozmixujeme. Lívance smažíme na pánvi. Lépe chutnají s medem nebo něčím sladkým, navrch můžeme dát borůvky.'),
  r('Ovocný salát', '🍓', 'breakfast', 'Bez vaření', [
    'Ovoce dle sezóny|400 g', 'Citron|½ ks',
  ], 'Ovoce nakrájíme na kousky a zalijeme citronovou šťávou.'),
  r('Mini banánové palačinky', '🍌', 'breakfast', 'Smažení', [
    'Banán|2 ks', 'Mouka hladká|100 g', 'Mléko|150 ml', 'Vejce|1 ks', 'Olej|1 lžíce',
  ], 'Připravíme těsto na palačinky z mouky, mléka a vejce. Banány nakrájíme na kolečka, obalíme v těstu a smažíme na pánvi.'),
  r('Jogurtové palačinky', '🥞', 'breakfast', 'Smažení', [
    'Bílý řecký jogurt|150 g', 'Vejce|2 ks', 'Mléko|100 ml', 'Mouka špaldová|80 g', 'Protein|1 odměrka', 'Olej|1 lžíce',
  ], 'Smícháme bílý řecký jogurt, vejce, mléko a mouku (ideálně špaldovou). Můžeme přidat sladidlo nebo protein. Palačinky smažíme na pánvi.'),
  r('Vaječný muffin z bílků', '🧁', 'breakfast', 'Pečení', [
    'Vaječné bílky|6 ks', 'Šunka|4 plátky', 'Špenát baby|1 hrst', 'Paprika|½ ks', 'Eidam strouhaný|50 g', 'Sůl, pepř|dle chuti',
  ], 'Do formiček na muffiny dáme nakrájenou šunku, zeleninu a špenát, zalijeme bílky a navrch posypeme sýrem. Zapékáme v troubě dozlatova. Stejně se dá upéct i jako slaný koláč ve větší formě – hodí se i na svačinu.'),
  r('Shake z Originu', '🥤', 'breakfast', 'Mixování', [
    'Protein Origin|3 odměrky', 'Voda|0,2 l', 'Ovoce|1 hrst',
  ], 'Do mixéru dáme 0,2 l vody, 3 odměrky proteinu a kousek ovoce a vše rozmixujeme.'),
  r('Dýňový koláč z mikrovlnky', '🎃', 'breakfast', 'Pečení', [
    'Protein Origin vanilkový|3 odměrky', 'Dýně upečená|50 g', 'Skořice|1 lžička', 'Vaječné bílky|3 ks', 'Med|1 lžička',
  ], 'Rozmícháme 3 odměrky vanilkového proteinu, 50 g upečené dýně, skořici, 3 bílky a med. Těsto dáme do skleněné mísy a necháme asi 5 minut péct v mikrovlnce.'),
  r('Míchaná vajíčka z bílků se žampiony', '🍳', 'breakfast', 'Smažení', [
    'Žampiony|200 g', 'Cibule|½ ks', 'Vaječné bílky|3 ks', 'Kurkuma|½ lžičky', 'Sůl, pepř|dle chuti', 'Zelenina k podávání|1 hrst',
  ], 'Osmahneme žampiony, případně i cibuli. Přidáme koření, ideálně kurkumu, sůl a pepř. Poté přidáme 3 bílky a promícháme. Vhodná je bokem zelenina.'),
  r('Jablečné lívance', '🍎', 'breakfast', 'Mixování + smažení', [
    'Jablko|1 ks', 'Ovesné vločky|6 lžic', 'Vejce|2 ks', 'Mléko|100 ml', 'Olej|1 lžíce',
  ], 'Jablko, vločky, vejce a mléko rozmixujeme na husté těsto. Lépe se hodí malé lívanečky než palačinky. Smažíme na pánvi.'),
  r('Cottage wrap na plechu', '🌯', 'breakfast', 'Mixování + pečení', [
    'Cottage sýr|200 g', 'Vejce|2 ks', 'Ovesné vločky|3 lžíce', 'Eidam strouhaný|50 g', 'Sůl, pepř|dle chuti',
  ], 'Rozmixujeme cottage, vejce a koření (případně i pár lžic vloček, česnek nebo bylinky – na 1 balení cottage 2 vejce). Těsto rozetřeme na plech s pečicím papírem, přidáme sýr a upečeme. Můžeme použít i na pánvi jako palačinky nebo jako základ pizzy. Plníme dle chuti.'),
  r('Cottage palačinky', '🥞', 'breakfast', 'Mixování + smažení', [
    'Cottage sýr|200 g', 'Vejce|1 ks', 'Mouka hladká|2 lžíce', 'Voda|100 ml', 'Sůl, koření|dle chuti', 'Olej|1 lžíce',
  ], 'Rozmixujeme 200 g cottage, 1 vejce, trochu mouky, 100 ml vody, špetku soli a další koření. Palačinky smažíme na pánvi.'),
  r('Míchaná vajíčka s cottage', '🍳', 'breakfast', 'Smažení', [
    'Vejce|4 ks', 'Cottage sýr|100 g', 'Sůl, pepř|dle chuti', 'Máslo|1 lžička',
  ], 'Vejce rozmixujeme s cottage a pomalu míchaná vajíčka děláme na pánvi.'),
  r('Sýrová vajíčka se šunkou', '🧀', 'breakfast', 'Smažení', [
    'Eidam strouhaný|80 g', 'Šunka|4 plátky', 'Vejce|2 ks', 'Olej|1 lžička',
  ], 'Na pánvi roztavíme sýr, na něj položíme šunku a uděláme na ní volská oka.'),
  r('Jogurt s chia semínky a medem', '🥛', 'breakfast', 'Bez vaření', [
    'Řecký jogurt|300 g', 'Chia semínka|2 lžíce', 'Med|2 lžičky', 'Káva|1 espresso', 'Kakao|1 špetka',
  ], 'Zamícháme řecký jogurt s chia semínky, medem a případně kávou (nemusí být). Navrch dáme opět jogurt a špetku kakaa.'),
  r('Mayo vajíčka z mikrovlnky', '🥚', 'breakfast', 'Pečení', [
    'Vejce|2 ks', 'Majonéza|2 lžíce',
  ], 'Do misky dáme na každé vejce jednu velkou lžíci majonézy a prošleháme. Vložíme do mikrovlnky na 35 vteřin.'),
  r('Pudinková ovesná kaše', '🥣', 'breakfast', 'Vaření', [
    'Ovesné vločky|60 g', 'Pudinkový prášek|40 g', 'Mléko|300 ml', 'Protein|1 odměrka', 'Ovoce nebo čokoláda|dle chuti',
  ], 'V hrnci smícháme ovesné vločky (30 g na porci), pudinkový prášek (20 g na porci), mléko a protein. Vaříme do zhoustnutí a změknutí. Můžeme ozdobit ovocem nebo čokoládou.'),

  // ===== OBĚDY =====
  r('Steak a zelenina', '🥩', 'lunch', 'Smažení', [
    ['Hovězí steak', '2 ks'], ['Brokolice', '300 g'], ['Cuketa', '1 ks'], ['Olivový olej', '1 lžíce'], ['Máslo', '1 lžíce'],
  ], 'Steaky osolíme a opečeme na rozpálené pánvi na másle do požadované propečenosti. Zeleninu orestujeme na oleji a podáváme spolu.'),
  r('Brokolice, nudle a hovězí', '🥦', 'lunch', 'Smažení', [
    ['Hovězí maso na stroganov', '300 g'], ['Brokolice', '300 g'], ['Vaječné nudle', '200 g'], ['Sójová omáčka', '3 lžíce'], ['Česnek', '2 stroužky'],
  ], 'Nudle uvaříme. Maso prudce osmahneme, přidáme brokolici a česnek a podusíme. Smícháme s nudlemi a dochutíme sójovou omáčkou.'),
  r('Kuřecí křídla / paličky s přílohou', '🍗', 'lunch', 'Pečení', [
    ['Kuřecí paličky nebo křídla', '600 g'], ['Brambory', '500 g'], ['Paprika sladká mletá', '2 lžičky'], ['Pepř', 'dle chuti'], ['Česnek granulovaný', '1 lžička'], ['Parmezán strouhaný', '40 g'], ['Olej', '2 lžíce'],
  ], 'Maso obalíme v paprice, pepři, česneku, parmezánu a oleji (Pájino obalení). Děláme ve fritéze, nebo spolu s brambory pečeme na plechu při 200 °C asi 45 minut dozlatova.'),
  r('Kuře s rýží', '🍚', 'lunch', 'Vaření', [
    ['Kuřecí prsa', '300 g'], ['Rýže jasmínová', '150 g'], ['Mrkev', '1 ks'], ['Hrášek mražený', '100 g'], ['Olej', '1 lžíce'],
  ], 'Rýži uvaříme. Kuřecí maso nakrájené na kostky orestujeme s mrkví, přidáme hrášek a podusíme. Podáváme s rýží.'),
  r('Kuřecí wrap se salátem', '🌯', 'lunch', 'Smažení', [
    ['Tortilla pšeničná', '2 ks'], ['Kuřecí prsa', '250 g'], ['Salát ledový', '4 listy'], ['Rajčata', '1 ks'], ['Jogurtový dresink', '3 lžíce'],
  ], 'Kuřecí prsa nakrájená na proužky osmažíme. Tortilly potřeme dresinkem, naplníme masem, salátem a rajčetem a zabalíme. Tip, jak tortillu pěkně zabalit (Moses fold): https://www.facebook.com/reel/2130738138319797'),
  r('Fajitas', '🌮', 'lunch', 'Smažení', [
    ['Kuřecí prsa', '300 g'], ['Tortilla pšeničná', '4 ks'], ['Paprika', '2 ks'], ['Cibule', '1 ks'], ['Směs na fajitas', '1 sáček'], ['Zakysaná smetana', '100 g'],
  ], 'Maso, papriku a cibuli nakrájíme na proužky a osmahneme s kořenicí směsí. Plníme do ohřátých tortill se zakysanou smetanou.'),
  r('Chilli con carne', '🌶️', 'lunch', 'Vaření', [
    ['Mleté hovězí maso', '300 g'], ['Fazole červené v nálevu', '1 plechovka'], ['Kukuřice', '100 g'], ['Rajčata drcená', '400 g'], ['Cibule', '1 ks'], ['Chilli koření', '1 lžička'],
  ], 'Cibuli a maso zprudka osmahneme, přidáme rajčata, koření, fazole a kukuřici. Za občasného míchání vaříme asi 30 minut. Podáváme s rýží nebo chlebem.'),
  r('Burrito', '🌯', 'lunch', 'Smažení', [
    ['Tortilla pšeničná', '2 velké'], ['Mleté hovězí maso', '250 g'], ['Rýže', '100 g'], ['Fazole červené v nálevu', '½ plechovky'], ['Eidam strouhaný', '50 g'], ['Salsa omáčka', '3 lžíce'],
  ], 'Rýži uvaříme, maso osmahneme se salsou a fazolemi. Na tortillu dáme rýži, náplň a sýr, zabalíme a z obou stran opečeme na pánvi.'),
  r('Těstovinový salát', '🥗', 'lunch', 'Vaření', [
    ['Těstoviny fusilli', '200 g'], ['Kuřecí šunka', '100 g'], ['Kukuřice', '100 g'], ['Okurka', '1 ks'], ['Cherry rajčata', '8 ks'], ['Majonéza', '2 lžíce'],
  ], 'Těstoviny uvaříme a necháme vychladnout. Smícháme s nakrájenou zeleninou, šunkou, kukuřicí a majonézou a dochutíme.'),
  r('Losos (s bramborem/zeleninou)', '🐟', 'lunch', 'Pečení', [
    ['Filet z lososa', '2 ks'], ['Brambory', '400 g'], ['Brokolice', '250 g'], ['Citron', '½ ks'], ['Olivový olej', '1 lžíce'],
  ], 'Brambory a brokolici pokapeme olejem a pečeme při 200 °C 15 minut. Přidáme lososa s citronem a pečeme dalších 12–15 minut.'),

  // Večeře a obědy od Páji
  r('Kuřecí teriyaki', '🍱', 'lunch', 'Smažení', [
    'Kuřecí prsa|400 g', 'Kukuřičný škrob|4 lžíce', 'Olej|2 lžíce', 'Voda|2 hrnky', 'Sriracha|2 lžíce', 'Sójová omáčka|5 lžic', 'Česnek|2 stroužky', 'Med|3 lžíce', 'Cukr|2 lžíce', 'Rýže jasmínová|150 g',
  ], 'Maso nakrájené na kostičky obalíme v kukuřičném škrobu a osmahneme. Přidáme 2 hrnky vody, 2 lžíce srirachy, 5 lžic sójové omáčky, 2 stroužky česneku, 3 lžíce medu a 2 lžíce cukru a vaříme. Poté zahustíme 2 lžícemi škrobu rozmíchanými ve vodě. Podáváme s uvařenou rýží.'),
  r('Zapečená brokolice s masem', '🥦', 'lunch', 'Pečení', [
    'Brokolice|400 g', 'Kuřecí maso|300 g', 'Kukuřice|100 g', 'Cibule|1 ks', 'Mléko|200 ml', 'Vejce|2 ks', 'Eidam strouhaný|100 g', 'Sůl, pepř|dle chuti',
  ], 'Do pekáče dáme brokolici, maso nakrájené na kostičky, kukuřici a cibuli. Zalijeme mlékem rozmíchaným s vejcem (klidně může být smetana) a okořeníme. Navrch dáme sýr nebo mozzarellu a zapečeme.'),
  r('Květákový steak s cizrnovou kaší', '🥦', 'lunch', 'Pečení', [
    'Květák|1 ks', 'Olivový olej|2 lžíce', 'Parmezán|30 g', 'Česnek|2 hlavičky', 'Cizrna sterilovaná|1 plechovka', 'Sůl, pepř, paprika|dle chuti',
  ], 'Květák nakrájíme na plátky, potřeme olejem a kořením, navrch můžeme přidat parmezán. Pečeme v troubě spolu se 2 hlavičkami česneku. Upečený česnek rozmixujeme s cizrnou, vodou a kořením na kaši a podáváme ke květáku.'),
  r('České tapas', '🧀', 'lunch', 'Bez vaření', [
    'Pečivo|4 ks', 'Šunka|100 g', 'Sýr|120 g', 'Zelenina dle chuti|1 hrst', 'Salám|80 g',
  ], 'Na prkénko naaranžujeme pečivo a všechno, co je doma: zeleninu, šunku, sýr a další dobroty.'),
  r('Smashed brokolice nebo brambory', '🥦', 'lunch', 'Vaření + pečení', [
    'Brokolice nebo brambory|500 g', 'Olivový olej|2 lžíce', 'Parmezán|40 g', 'Sůl, pepř, česnek|dle chuti',
  ], 'Brokolici nebo brambory povaříme asi 5 minut, pak je rozdrtíme (například dnem sklenice), přidáme olej, koření a parmezán a dáme zapéct do trouby.'),
  r('Mrkvové nebo brokolicové hranolky', '🥕', 'lunch', 'Pečení', [
    'Mrkev nebo brokolice|500 g', 'Eidam strouhaný|60 g', 'Koření|dle chuti', 'Olej|1 lžíce',
  ], 'Hranolky z mrkve nebo brokolice obalíme v koření a sýru a zapečeme v troubě.'),
  r('Masová nebo brokolicová pizza', '🍕', 'lunch', 'Pečení', [
    'Kuřecí mleté maso|300 g', 'Vaječné bílky|4 ks', 'Koření|dle chuti', 'Zelenina na ozdobu|1 hrst', 'Eidam strouhaný|60 g',
  ], 'Mleté kuřecí maso (nebo nastrouhanou brokolici) smícháme s kořením a bílky (u masa lze vyšlehat sníh ze 4 bílků) a vytvarujeme korpus. Zapečeme, pak obložíme zeleninou a sýrem.'),
  r('Tortilla se sýrem, špenátem a tuňákem', '🌯', 'lunch', 'Pečení', [
    'Tortilla pšeničná|2 ks', 'Eidam strouhaný|100 g', 'Špenát baby|1 hrst', 'Tuňák ve vlastní šťávě|1 plechovka', 'Cibule|½ ks', 'Vejce|2 ks',
  ], 'Na tortillu dáme sýr, špenát, tuňáka, cibuli nakrájenou na kolečka, 2 vejce a zase sýr. Poté zapečeme.'),
  r('Zapečené žampiony', '🍄', 'lunch', 'Pečení', [
    'Žampiony velké|8 ks', 'Šunka|80 g', 'Cibule|½ ks', 'Eidam strouhaný|80 g',
  ], 'Žampiony vydlabeme. Nadrobno nakrájíme šunku, cibuli i vydlabané části hub a vrátíme je do hub. Navrch dáme sýr a zapečeme.'),
  r('Smashed růžičková kapusta', '🥬', 'lunch', 'Vaření + pečení', [
    'Růžičková kapusta|400 g', 'Olivový olej|1 lžíce', 'Sůl, pepř, česnek|dle chuti',
  ], 'Růžičkovou kapustu uvaříme a opláchneme, dáme na plech a rozdrtíme. Okořeníme a zapečeme.'),
  r('Pečené brambory plněné sýrem a slaninou', '🥔', 'lunch', 'Pečení', [
    'Brambory|600 g', 'Eidam plátkový|100 g', 'Slanina|80 g', 'Koření|dle chuti', 'Jogurtový dip|3 lžíce', 'Alobal|1 role',
  ], 'Brambory prošpikujeme sýrem a slaninou (nebo klobásou), okořeníme, zabalíme do alobalu a zapečeme. Vhodný je k tomu dip.'),
  r('Zdravá tortilla z quinoy a chia', '🌯', 'lunch', 'Mixování + smažení', [
    'Quinoa|100 g', 'Chia semínka|2 lžíce', 'Voda|200 ml', 'Sůl|1 špetka', 'Olej|1 lžíce',
  ], 'Quinou propláchneme a spolu s chia semínky dáme do mixéru. Zalijeme vodou, přidáme sůl a rozmixujeme na těsto na tortilly. Pečeme na pánvi.'),
  r('Slaný koláč z tortilly', '🥧', 'lunch', 'Pečení', [
    'Tortilla pšeničná|2 ks', 'Zelenina dle chuti|300 g', 'Eidam strouhaný|100 g', 'Vejce|3 ks', 'Mléko|100 ml', 'Cottage sýr|100 g', 'Sůl, pepř|dle chuti',
  ], 'Tortillu naplníme zeleninou a posypeme sýrem. Zalijeme vajíčkem rozšlehaným s mlékem a kořením (může se přidat i cottage) a necháme zapéct.'),
  r('Mrkvová tortilla', '🥕', 'lunch', 'Pečení', [
    'Mrkev|3 ks', 'Eidam strouhaný|80 g', 'Vejce|2 ks', 'Sůl, koření|dle chuti', 'Náplň dle chuti|1 hrst',
  ], 'Mrkev nastrouháme, přidáme sýr, vejce a ochutíme. Rozetřeme na pečicí papír a pečeme 15 minut při 180 °C. Dovnitř dáme cokoliv dobrého.'),
  r('Bramborové placičky se sýrem', '🥔', 'lunch', 'Vaření + smažení', [
    'Brambory|500 g', 'Eidam strouhaný|100 g', 'Mouka hladká|3 lžíce', 'Máslo|1 lžíce', 'Sůl|dle chuti',
  ], 'Brambory uvaříme ve slupce (nejlépe den předem a necháme přes noc v lednici), oloupeme a nastrouháme nebo rozmačkáme na hustou kaši. Přidáme sýr a mouku. Placičky smažíme na pánvi bez oleje a potřeme máslem.'),
  r('Pizza tortilla', '🍕', 'lunch', 'Pečení', [
    'Tortilla pšeničná|2 ks', 'Eidam strouhaný|100 g', 'Kečup|3 lžíce', 'Šunka|80 g', 'Koření na pizzu|dle chuti',
  ], 'Na tortillu dáme sýr, kečup, koření, šunku a cokoliv dalšího, přiklopíme druhou tortillou a pečeme v troubě nebo ve fritéze.'),
  r('Brokolicové placky', '🥦', 'lunch', 'Vaření + smažení', [
    'Brokolice|400 g', 'Vejce|2 ks', 'Eidam strouhaný|80 g', 'Kukuřičný škrob|2 lžíce', 'Šunka|50 g', 'Sůl, pepř|dle chuti', 'Olej|2 lžíce',
  ], 'Brokolici uvaříme, přidáme vejce, sýr, škrob, koření a klidně i šunku. Placky smažíme na pánvi.'),
  r('Žampionová tortilla', '🍄', 'lunch', 'Smažení', [
    'Tortilla pšeničná|2 ks', 'Žampiony|200 g', 'Cibule|½ ks', 'Vejce|3 ks', 'Eidam strouhaný|80 g', 'Jarní cibulka|2 ks', 'Olej|1 lžíce',
  ], 'Osmahneme houby a cibuli, pak přidáme vejce (může být i cottage) a sýr. Přiložíme tortillu, přidáme zase sýr a jarní cibulku.'),
  r('Tortillové šneky', '🌯', 'lunch', 'Pečení', [
    'Tortilla pšeničná|3 ks', 'Eidam strouhaný|120 g', 'Šunka|100 g', 'Koření|dle chuti',
  ], 'Do tortill dáme sýr, šunku, koření a další, zarolujeme a nakrájíme na kolečka. Kolečka naskládáme do formy na dort, posypeme sýrem a dáme do trouby.'),
  r('Špenátová pizza nebo palačinka', '🍕', 'lunch', 'Mixování + smažení', [
    'Špenát baby|150 g', 'Ovesné vločky|4 lžíce', 'Vejce|2 ks', 'Kečup|3 lžíce', 'Šunka|80 g', 'Eidam strouhaný|80 g', 'Koření|dle chuti',
  ], 'Špenát, vločky a vejce rozmixujeme a těsto uděláme na pánvi jako palačinku. Přidáme kečup, šunku, sýr a koření.'),
  r('Rýžová pizza', '🍕', 'lunch', 'Mixování + pečení', [
    'Rýže uvařená|200 g', 'Vejce|2 ks', 'Eidam strouhaný|80 g', 'Koření|dle chuti', 'Kečup|3 lžíce', 'Šunka|80 g',
  ], 'Uvařenou rýži rozmixujeme s vejcem, sýrem a kořením. Dáme do misky na dort (nebo na plech) a necháme zapéct. Poté přidáme ingredience jako na pizzu a ještě krátce zapečeme.'),
  r('Bramborový sendvič', '🥔', 'lunch', 'Pečení', [
    'Brambory velké|3 ks', 'Eidam plátkový|100 g', 'Slanina|80 g', 'Vejce|2 ks', 'Omáčka|2 lžíce', 'Koření|dle chuti',
  ], 'Brambory nakrájíme na plátky a na každém uděláme mřížku pomocí špejlí. Dáme je do trouby s kořením péct. Na brambory dáme sýr, slaninu a vejce (míchané nebo volské), omáčku a další plátek brambory. Hodí se k tomu dip.'),
  r('Bramborová omeleta', '🍳', 'lunch', 'Smažení', [
    'Brambory uvařené|400 g', 'Vejce|4 ks', 'Eidam strouhaný|80 g', 'Šunka|60 g', 'Mozzarella|60 g', 'Polníček|1 hrst', 'Jarní cibulka|2 ks', 'Olej|1 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Na pánvi osmažíme brambory nakrájené na kolečka z obou stran, okořeníme a zalijeme rozšlehaným vejcem. Přidáme sýr a nakonec přihodíme šunku, mozzarellu, polníček a jarní cibulku.'),
  r('Pečené květákové plátky se sýrem', '🥦', 'lunch', 'Pečení', [
    'Květák|1 ks', 'Olej|2 lžíce', 'Koření|dle chuti', 'Eidam strouhaný|80 g',
  ], 'Květák nakrájíme na plátky, přidáme olej a koření a můžeme přihodit i sýr. Dáme zapéct.'),
  r('Wrap z červené čočky nebo quinoy', '🌯', 'lunch', 'Mixování + smažení', [
    'Červená čočka|150 g', 'Voda|200 ml', 'Sůl, koření|dle chuti', 'Maso a zelenina na plnění|dle chuti',
  ], 'Čočku (nebo quinou) necháme přes noc namočenou ve vodě, scedíme, rozmixujeme s čerstvou vodou a kořením a máme těsto. Pečeme na pánvi jako tortillu (hodí se i samotná jako pečivo) a plníme masem, zeleninou a podobně.'),
  r('Zeleninový koláč', '🥧', 'lunch', 'Pečení', [
    'Cuketa|1 ks', 'Mrkev|2 ks', 'Brambory|2 ks', 'Mouka hladká|3 lžíce', 'Vejce|2 ks', 'Eidam strouhaný|100 g', 'Koření|dle chuti', 'Šunka|50 g',
  ], 'Nastrouháme cuketu, mrkev a brambory (může být i brokolice, šunka a podobně). Přidáme mouku, vejce, sýr a koření a zapečeme v troubě. Navrch můžeme poté přidat sýr. Zapékáme buď v koláčové míse, nebo děláme na pánvi jako tortillu.'),
  r('Babybel jako smažák', '🧀', 'lunch', 'Fritéza', [
    'Sýr Babybel|6 ks', 'Vejce|1 ks', 'Strouhanka|50 g', 'Mouka hladká|2 lžíce',
  ], 'Sýr Babybel obalíme (v mouce, vejci a strouhance) a uděláme ve fritéze.'),
  r('Cuketová pizza', '🍕', 'lunch', 'Pečení', [
    'Cuketa|1 ks', 'Vejce|2 ks', 'Koření|dle chuti', 'Kečup|3 lžíce', 'Šunka|80 g', 'Eidam strouhaný|80 g',
  ], 'Cuketu nastrouháme a odvodníme, přidáme koření a vejce a necháme zapéct. Navrch dáme kečup, šunku a podobně.'),
  r('Wrap ze salátového listu', '🥬', 'lunch', 'Bez vaření', [
    'Salát ledový nebo římský|1 hlávka', 'Náplň (maso, zelenina, sýr)|dle chuti',
  ], 'Do salátového listu zabalíme vše jako do tortilly.'),
  r('Cuketové placky', '🥒', 'lunch', 'Smažení', [
    'Cuketa|1 ks', 'Cottage sýr|100 g', 'Vejce|2 ks', 'Strouhanka|3 lžíce', 'Eidam strouhaný|60 g', 'Sůl, pepř|dle chuti', 'Olej|2 lžíce',
  ], 'Na těsto smícháme cuketu bez vody, cottage sýr, 2 vejce, strouhanku, sýr a koření. Děláme jako lívance na pánvi.'),
  r('Wrap z cukety a mrkve', '🌯', 'lunch', 'Pečení', [
    'Cuketa|1 ks', 'Mrkev|2 ks', 'Vejce|2 ks', 'Eidam strouhaný|80 g', 'Sůl, koření|dle chuti',
  ], 'Smícháme nastrouhanou mrkev a cuketu bez vody, přidáme vejce, sýr a koření. Dáme na plech a pečeme jako placku.'),
  r('Bramborový toast', '🥔', 'lunch', 'Vaření + fritéza', [
    'Brambory|500 g', 'Šunka|100 g', 'Eidam plátkový|100 g', 'Kukuřičné lupínky|50 g', 'Sůl|dle chuti',
  ], 'Brambory uvaříme, rozmačkáme a přidáme sůl. Z těsta uděláme placku, dáme na ni šunku a sýr, navrch další placku a obalíme v kukuřičných lupíncích. Uděláme ve fritéze nebo na plechu.'),
  r('Mrkvové tacos', '🌮', 'lunch', 'Pečení', [
    'Mrkev|3 ks', 'Eidam strouhaný|80 g', 'Vejce|2 ks', 'Koření|dle chuti', 'Šunka|80 g', 'Zelenina k plnění|1 hrst',
  ], 'Nastrouháme mrkev, přidáme sýr, vejce a koření. Dáme na pečicí papír do tvaru koleček a zapečeme. Necháme chvíli vytvarovat do tvaru tacos a naplníme šunkou, zeleninou a podobně.'),
  r('Bramborový koláč', '🥧', 'lunch', 'Pečení', [
    'Brambory uvařené|600 g', 'Cibule|½ ks', 'Párek|2 ks', 'Šunka|80 g', 'Slanina|50 g', 'Eidam strouhaný|100 g', 'Mléko|100 ml', 'Vejce|2 ks', 'Cottage sýr|100 g', 'Zelenina|1 hrst',
  ], 'Uvařené brambory rozmačkáme do formy na koláč (s pečicím papírem). Přidáme cibulku, párek, slaninu, šunku, zeleninu a sýr. Zalijeme mlékem a vejcem (můžeme přidat cottage), navrch posypeme sýrem a zapečeme. Můžeme tam dát i udělané maso a houby.'),
  r('Cuketový burger', '🍔', 'lunch', 'Smažení', [
    'Cuketa|1 ks', 'Strouhanka|3 lžíce', 'Vejce|1 ks', 'Eidam strouhaný|60 g', 'Eidam plátkový|2 plátky', 'Olej|2 lžíce',
  ], 'Smícháme odvodněnou nastrouhanou cuketu, strouhanku, vejce a sýr a vytvarujeme placky. Mezi 2 stejné placky dáme sýr a smažíme na pánvi.'),
  r('Cizrnová pizza', '🍕', 'lunch', 'Mixování + pečení', [
    'Cizrna sterilovaná|1 plechovka', 'Vejce|1 ks', 'Koření|dle chuti', 'Kečup|3 lžíce', 'Eidam strouhaný|60 g', 'Šunka|60 g',
  ], 'Cizrnu rozmixujeme s vejcem a kořením a rozetřeme na plech do tvaru pizzy (nebo několika malých pizz). Zapečeme a navrch dáme přísady: kečup, koření, sýr a šunku.'),
  r('Pizza z cottage sýru', '🍕', 'lunch', 'Mixování + pečení', [
    'Cottage sýr|500 g', 'Vejce|2 ks', 'Mouka špaldová|80 g', 'Koření|dle chuti', 'Kečup|3 lžíce', 'Šunka|100 g', 'Eidam strouhaný|100 g',
  ], 'Na těsto rozmixujeme 500 g cottage sýru, 2 vejce, 80 g špaldové mouky a koření (menší pizza: 200 g cottage, 1 vejce, 50 g mouky nebo rozmixovaných vloček). Těsto rozložíme na plech, zapečeme a pak přidáme kečup, sýr, šunku a další ingredience.'),
  r('Cottage placky se šunkou a sýrem', '🧀', 'lunch', 'Pečení', [
    'Cottage sýr|200 g', 'Mouka hladká|1 lžíce', 'Šunka|80 g', 'Eidam strouhaný|60 g', 'Jarní cibulka|2 ks', 'Vejce|2 ks', 'Koření|dle chuti',
  ], 'Smícháme 200 g cottage, 1 lžíci mouky, šunku (nebo párek), sýr, jarní cibulku, 2 vejce a koření. Na plech vytvoříme placky ve tvaru koleček a pečeme 15 minut při 200 °C.'),
  r('Bramborový wrap', '🥔', 'lunch', 'Pečení', [
    'Brambory|3 ks', 'Olej|1 lžíce', 'Eidam strouhaný|60 g', 'Koření|dle chuti',
  ], 'Brambory nakrájíme na tenká kolečka a vyskládáme je přes sebe na plech do tvaru wrapu. Dáme na ně koření, olej a případně sýr. Zapečeme a pak použijeme jako pečivo.'),
  r('Kuřecí stehna ve fritéze', '🍗', 'lunch', 'Fritéza', [
    'Kuřecí stehna|600 g', 'Sójová omáčka|3 lžíce', 'Koření na kuře|1 lžíce', 'Citron|1 ks',
  ], 'Stehna ze stran nařežeme a naložíme do koření a sójové omáčky. Pak je dáme do fritézy a navrch položíme plátek citronu.'),
  r('Gyoza z rýžového papíru', '🥟', 'lunch', 'Fritéza', [
    'Kuřecí mleté maso|300 g', 'Vejce|1 ks', 'Jarní cibulka|2 ks', 'Sójová omáčka|2 lžíce', 'Kukuřičný škrob|1 lžíce', 'Česnek|2 stroužky', 'Sezamová semínka|1 lžíce', 'Rýžový papír|8 ks', 'Sůl, pepř|dle chuti',
  ], 'Smícháme mleté kuřecí (nebo jiné maso), vejce, jarní cibulku, sójovou omáčku, škrob, česnek, sezamová semínka, sůl a pepř. Rýžový papír rozstřihneme napůl a namočíme ve vodě. Do něj dáme směs a zabalíme. Dáme na plech (do fritézy) a děláme dokřupava.'),
  r('Brambory na loupačku', '🥔', 'lunch', 'Vaření', [
    'Brambory|800 g', 'Máslo|2 lžíce', 'Sůl|dle chuti', 'Kmín|1 lžička',
  ], 'Brambory důkladně umyjeme a uvaříme ve slupce v osolené vodě s kmínem do měkka (asi 20 až 25 minut). Podáváme horké, každý si je oloupe sám, a k nim máslo a sůl.'),
  r('Kuřecí směs s květákem', '🍛', 'lunch', 'Smažení', [
    'Cibule|1 ks', 'Kuřecí prsa|300 g', 'Květák|300 g', 'Kokosové mléko|200 ml', 'Kurkuma|1 lžička', 'Olej|1 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Na pánvi osmahneme cibuli, pak přidáme maso a poté květák nakrájený na malé kousky. Zalijeme kokosovým mlékem a přidáme kurkumu. Dusíme do změknutí.'),
  r('Bramborový burger', '🍔', 'lunch', 'Pečení', [
    'Brambory velké|2 ks', 'Mleté hovězí maso|250 g', 'Eidam plátkový|2 plátky', 'Salát|2 listy', 'Rajčata|1 ks', 'Olej|1 lžíce',
  ], 'Místo pečiva použijeme veliké plátky brambory, které upečeme dozlatova. Mezi ně dáme burgerové maso, sýr a zeleninu.'),
  r('Kukuřičná placka', '🌽', 'lunch', 'Pečení', [
    'Kukuřice|200 g', 'Eidam strouhaný|80 g', 'Vejce|2 ks', 'Cottage sýr|50 g', 'Šunka|60 g', 'Koření|dle chuti',
  ], 'Na plech vyskládáme do kolečka kukuřici (případně smícháme s vajíčky), dáme na ni sýr a koření (případně cottage). Upečeme a poté na to dáme šunku a další přísady.'),
  r('Bageta s masovými kuličkami', '🥖', 'lunch', 'Vaření + pečení', [
    'Bageta|1 ks', 'Mleté maso|300 g', 'Rajčatová omáčka|200 ml', 'Eidam strouhaný|60 g', 'Vejce|1 ks', 'Strouhanka|2 lžíce', 'Sůl, koření|dle chuti',
  ], 'Připravíme kuličky z mletého masa, vejce, strouhanky a koření, upečeme je nebo osmažíme a promícháme s omáčkou. Nacpeme do velké bagety a posypeme sýrem.'),
  r('Hot honey popcorn chicken', '🍯', 'lunch', 'Pečení + smažení', [
    'Kuřecí prsa|400 g', 'Cibule granulovaná|1 lžička', 'Česnek granulovaný|1 lžička', 'Paprika|1 lžička', 'Chilli|½ lžičky', 'Vejce|1 ks', 'Kukuřičný škrob|4 lžíce', 'Med|3 lžíce', 'Sriracha|1 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Kuře nakrájíme na malé kousky a okořeníme (cibule, česnek, paprika, chilli, sůl, pepř) s vejcem. Obalíme v kukuřičném škrobu a upečeme v troubě. Nakonec kousky obalíme na pánvi v omáčce z medu a srirachy.'),
  r('Nuggetky', '🍗', 'lunch', 'Pečení', [
    'Kuřecí mleté maso|400 g', 'Sůl, pepř|dle chuti', 'Česnek sušený|1 lžička', 'Cibule sušená|1 lžička', 'Kukuřičný škrob|4 lžíce',
  ], 'Mleté kuřecí maso smícháme se solí, pepřem, sušeným česnekem a cibulí a vytvarujeme nugetky. Obalíme v kukuřičném škrobu a děláme v troubě.'),
  r('Vánoční salát', '🥗', 'lunch', 'Vaření', [
    'Vejce|6 ks', 'Brambory střední|9 ks', 'Okurky kyselé|1 až 2 sklenice', 'Pórek|1 kousek', 'Majonéza|4 lžíce', 'Hořčice|2 lžíce', 'Jarní cibulka|2 ks', 'Sůl, pepř|dle chuti',
  ], 'Vejce uvaříme natvrdo a brambory ve slupce. Vše nakrájíme na kostičky, přidáme okurky a pórek, smícháme s majonézou, hořčicí, solí a pepřem. Navrch posypeme jarní cibulkou.'),
  r('Juan Patatos Salados', '🌮', 'lunch', 'Bez vaření', [
    'Kukuřice|200 g', 'Nachos|100 g', 'Čedar|80 g', 'Jalapeňo|2 lžíce', 'Jarní cibulka|2 ks', 'Červená cibule|½ ks', 'Koriandr|volitelně', 'Zakysaná smetana|100 g', 'Koření|dle chuti',
  ], 'Smícháme kukuřici, nachos, čedar, jalapeňo, jarní a červenou cibuli (a koriandr). Navrch dáme zakysanou smetanu a koření.'),
  r('Bramborové placky plněné sýrem', '🥔', 'lunch', 'Smažení', [
    'Brambory uvařené|500 g', 'Mouka hladká|4 lžíce', 'Sůl, pepř|dle chuti', 'Česnek sušený|1 lžička', 'Eidam plátkový|100 g', 'Olej|2 lžíce',
  ], 'Z brambor, mouky, soli, pepře a sušeného česneku uděláme těsto. Vytvarujeme placičku, dáme na ni sýr a přiklopíme druhou. Děláme na pánvi.'),
  r('Zdravý smažák z rýžového papíru', '🧀', 'lunch', 'Pečení', [
    'Rýžový papír|4 ks', 'Vejce|2 ks', 'Eidam plátkový|100 g', 'Šunka|80 g', 'Sůl|1 špetka',
  ], 'Rýžový papír namočíme ve vajíčku. Do něj vložíme sýr nakrájený na trojúhelník, šunku a trochu soli, zabalíme a zapečeme v troubě.'),
  r('Špenátové noky', '🥬', 'lunch', 'Vaření', [
    'Špenát čerstvý nebo mražený|200 g', 'Skyr nebo cottage sýr|100 g', 'Mouka špaldová|150 g', 'Sůl, pepř|dle chuti', 'Protein|1 odměrka',
  ], 'Na těsto rozmixujeme 200 g špenátu (čerstvý nebo mražený), 100 g skyru nebo cottage, sůl, pepř a 150 g mouky (ideálně špaldové). Případně přidáme proteinový prášek. Těsto vyválíme, nakrájíme a vaříme jako noky.'),
  r('Mac n cheese lasagne', '🧀', 'lunch', 'Vaření + pečení', [
    'Těstoviny|250 g', 'Eidam strouhaný|200 g', 'Mleté maso|300 g', 'Rajčatová omáčka|300 ml', 'Mléko|150 ml',
  ], 'Uděláme těstoviny se sýrem (mac n cheese) a maso na lasagne. Vrstvíme to do pekáče na lasagne, mezi vrstvy dáme sýr a také navrch. Zapečeme.'),
  r('Tortilla burger', '🍔', 'lunch', 'Smažení', [
    'Tortilla pšeničná|2 ks', 'Mleté hovězí maso|250 g', 'Eidam strouhaný|80 g', 'Cibule|½ ks', 'Sůl, pepř|dle chuti',
  ], 'Na tortillu dáme mleté hovězí maso, rozetřeme, přidáme sýr a cibuli a zapečeme spolu na pánvi.'),
  r('Cibulový burger', '🧅', 'lunch', 'Smažení', [
    'Cibule velká|2 ks', 'Mleté hovězí maso|250 g', 'Eidam plátkový|2 plátky', 'Salát|2 listy', 'Rajčata|1 ks', 'Olej|1 lžíce',
  ], 'Místo bulky osmažíme celé 2 plátky cibule, pak na ně dáme rozpustit sýr a dál doděláme burger (maso, zelenina).'),
  r('Pizza z rýžového papíru', '🍕', 'lunch', 'Pečení', [
    'Rýžový papír|2 ks', 'Vejce|2 ks', 'Kečup|2 lžíce', 'Eidam strouhaný|80 g', 'Šunka|60 g', 'Koření na pizzu|dle chuti',
  ], 'Rýžový papír namočíme do rozšlehaného vajíčka, naskládáme na něj, co patří na pizzu, a dáme do trouby.'),
  r('Bramborové lasagne', '🥔', 'lunch', 'Pečení', [
    'Brambory|600 g', 'Mleté maso|300 g', 'Rajčatová omáčka|300 ml', 'Eidam strouhaný|150 g', 'Mléko|150 ml',
  ], 'Dělá se stejně jako lasagne se sýrem a masem, ale místo těstovin dáme plátky brambor. Vrstvíme do pekáče a zapečeme.'),
  r('Lasagne z bramborové kaše', '🥔', 'lunch', 'Vaření + pečení', [
    'Brambory|600 g', 'Mléko|100 ml', 'Mleté maso|300 g', 'Eidam strouhaný|150 g', 'Rajčatová omáčka|200 ml',
  ], 'Uvaříme bramborovou kaši a připravíme masovou směs. Vrstvíme kaši, masovou směs a sýr a zapečeme.'),
  r('Tortilla z kuřecího mletého', '🌯', 'lunch', 'Pečení', [
    'Kuřecí mleté maso|300 g', 'Koření|dle chuti', 'Eidam strouhaný|80 g', 'Zelenina k plnění|1 hrst',
  ], 'Mleté maso smícháme s kořením a vytvarujeme do tvaru tortilly. Navrch dáme sýr a upečeme. Poté naplníme zeleninou.'),

  // ===== SVAČINY =====
  r('Tortilla z květáku', '🥦', 'snack', 'Mixování + smažení', [
    'Květák|300 g', 'Vejce|2 ks', 'Voda|50 ml', 'Sůl, koření|dle chuti', 'Olej|1 lžíce',
  ], 'Květák rozmixujeme s vejci, osolíme, přidáme koření a trochu vody tak, aby měla směs konzistenci jako těsto na palačinky. Pečeme na pánvi.'),
  r('Rýžové chlebíčky', '🍘', 'snack', 'Bez vaření', [
    'Rýžové chlebíčky|1 balení',
  ], 'Hotové rýžové chlebíčky z obchodu podáváme samotné nebo s pomazánkou.'),
  r('Čočkové chlebíčky', '🍘', 'snack', 'Bez vaření', [
    'Čočkové chlebíčky|1 balení',
  ], 'Hotové čočkové chlebíčky z obchodu podáváme samotné nebo s pomazánkou.'),
  r('Quinoa palačinky', '🥞', 'snack', 'Mixování + smažení', [
    'Quinoa|100 g', 'Voda|200 ml', 'Sůl|1 špetka', 'Olej|1 lžíce',
  ], 'Quinou nejprve propláchneme, dáme do mísy a zalijeme vodou. Necháme nasáknout alespoň 3 hodiny, scedíme a znovu propláchneme. Přemístíme do mixéru, zalijeme vodou, přidáme sůl a trochu oleje a rozmixujeme. Necháme chvíli odpočinout a pak děláme na pánvi.'),
  r('Housky z cizrny', '🫓', 'snack', 'Pečení', [
    'Cizrna sterilovaná|1 plechovka', 'Vejce|2 ks', 'Kypřící prášek|1 lžička', 'Olej|1 lžíce', 'Oregano|1 lžička', 'Sůl, pepř|dle chuti', 'Semínka|volitelně',
  ], 'Smícháme cizrnu, vejce, kypřící prášek, sůl, pepř, trochu oleje a oregano. Na 1 plechovku cizrny stačí 2 vejce a vyjde asi 5 košíčků. Můžeme přidat semínka. Dáme do malých misek a zapečeme. Dáme-li méně těsta a necháme déle péct, nebudou tolik vláčné.'),
  r('Tortilla z cizrny', '🌯', 'snack', 'Mixování + smažení', [
    'Cizrna suchá|200 g', 'Voda|300 ml', 'Sůl, pepř|dle chuti', 'Česnek|1 stroužek', 'Olej|1 lžíce',
  ], 'Cizrnu dáme do mísy a zalijeme vodou (poměr 2:3), přidáme sůl, pepř a česnek. Necháme nasáknout 6 hodin. Pak rozmixujeme a děláme na pánvi.'),
  r('Špenátová tortilla (wrap)', '🥬', 'snack', 'Mixování + smažení', [
    'Špenát baby|150 g', 'Vejce|3 ks', 'Sůl, koření|dle chuti', 'Olej|1 lžíce', 'Šunka, sýr, zelenina|dle chuti',
  ], 'Čerstvý baby špenát rozmixujeme s vejci a kořením. Děláme na pánvi. Dovnitř se hodí sýr, šunka a zelenina.'),
  r('Housky z červené čočky', '🫓', 'snack', 'Pečení', [
    'Červená čočka|300 g', 'Sůl, pepř|dle chuti', 'Kypřící prášek|1 lžička', 'Semínka|2 lžíce',
  ], 'Červenou čočku (300 g) necháme namočit alespoň 3 hodiny. Smícháme se solí, pepřem, kypřícím práškem a libovolnými semínky a dáme do formiček do trouby.'),
  r('Sýrová placka z cottage', '🧀', 'snack', 'Pečení', [
    'Cottage sýr|250 g', 'Mozzarella|1 ks', 'Cibule|volitelně', 'Sůl, koření|dle chuti',
  ], 'Cottage rozprostřeme na plech, okořeníme, navrch dáme nastrouhanou mozzarellu (může se přidat i cibule) a dáme zapéct. Používáme jako tortillu nebo jako snack.'),
  r('Zeleninový wrap z cottage', '🌯', 'snack', 'Pečení', [
    'Cottage sýr|150 g', 'Vejce|2 ks', 'Mrkev|1 ks', 'Cuketa|½ ks', 'Žervé|2 lžíce', 'Šunka|60 g', 'Eidam plátkový|2 plátky',
  ], 'Smícháme cottage, vejce, nastrouhanou mrkev a cuketu (můžeme přidat i cibuli nebo kukuřici). Dáme na plech jako placku a upečeme. Dovnitř dáme žervé, šunku, sýr a další přísady.'),
  r('Bramborové palačinky', '🥞', 'snack', 'Mixování + smažení', [
    'Brambory uvařené|300 g', 'Olej|1 lžíce', 'Mléko|150 ml', 'Mouka hladká|60 g', 'Jarní cibulka|2 ks', 'Sůl, koření|dle chuti',
  ], 'Uvařené brambory umixujeme s olejem, mlékem, moukou, kořením a jarní cibulkou. Z těsta se dělají slané palačinky na pánvi.'),
  r('Mrkvový wrap / palačinka', '🥕', 'snack', 'Mixování + smažení', [
    'Mrkev|2 ks', 'Vejce|2 ks', 'Sůl, koření|dle chuti', 'Olej|1 lžíce',
  ], 'Rozmixujeme 2 mrkve a 2 vejce a přidáme koření. Děláme na pánvi. Dovnitř dáme cokoliv.'),
  r('Mozzarellová tortilla z vajec', '🧀', 'snack', 'Smažení', [
    'Vejce|2 ks', 'Mozzarella|1 ks', 'Sůl, koření|dle chuti', 'Polníček|1 hrst', 'Zelenina|dle chuti',
  ], 'Rozmixujeme 2 vejce s 1 mozzarellou a kořením. Dáme na plech nebo na pánev a uděláme jako tortillu (nebo pizzu). Hodí se k tomu polníček a zelenina.'),
  r('Cibulová placka', '🧅', 'snack', 'Pečení', [
    'Cibule|2 ks', 'Eidam strouhaný|80 g', 'Koření|dle chuti',
  ], 'Cibuli nakrájíme na kolečka a poskládáme na plech, okořeníme a posypeme sýrem. Zapečeme do placky.'),
  r('Placka na plech (tortilla)', '🥕', 'snack', 'Pečení', [
    'Mrkev|1 ks', 'Cuketa|1 ks', 'Brambory|1 ks', 'Vejce|3 ks', 'Mozzarella strouhaná|80 g', 'Oregano|1 lžička', 'Česnek sušený|1 lžička', 'Paprika sladká mletá|1 lžička', 'Sůl|dle chuti',
  ], 'Nastrouháme mrkev, cuketu a brambor, přidáme oregano, sůl, sušený česnek, papriku, 2 až 3 vejce a strouhanou mozzarellu (může být i cottage). Dáme na pečicí papír a uděláme placku. Plníme čím chceme.'),
  r('Flaxseed chleba', '🍞', 'snack', 'Pečení', [
    'Lněná semínka mletá|150 g', 'Vejce|2 ks', 'Kypřící prášek|1 lžička', 'Sůl|1 špetka', 'Voda|100 ml',
  ], 'Mletá lněná semínka smícháme s vejci, kypřícím práškem, solí a vodou a upečeme. Podrobný postup: https://www.facebook.com/reel/1412679723764778'),
  r('Kyselé okurky', '🥒', 'snack', 'Bez vaření', ['Kyselé okurky|1 sklenice'], 'Okurky vyndáme ze sklenice a podáváme jako lehkou svačinu.'),
  r('Kvalitní šunka', '🥓', 'snack', 'Bez vaření', ['Šunka kvalitní|100 g'], 'Plátky kvalitní šunky podáváme samotné nebo se zeleninou.'),
  r('Mandle blanšírované', '🌰', 'snack', 'Bez vaření', ['Mandle blanšírované|50 g'], 'Hrst blanšírovaných mandlí podáváme jako rychlou svačinu.'),
  r('Oříšky nesolené', '🥜', 'snack', 'Bez vaření', ['Oříšky nesolené|50 g'], 'Hrst nesolených oříšků podáváme jako rychlou svačinu.'),
  r('Zelenina na chroupání', '🥕', 'snack', 'Bez vaření', ['Mrkev|1 ks', 'Okurka|1 ks', 'Paprika|1 ks'], 'Zeleninu omyjeme, nakrájíme na tyčinky a podáváme samotnou nebo s dipem.'),
  r('Polévka do hrnečku (houbová)', '🍵', 'snack', 'Bez vaření', ['Polévka do hrnečku houbová|1 sáček'], 'Instantní polévku zalijeme horkou vodou podle návodu na obalu a promícháme.'),
  r('Zapečená cizrna ve fritéze', '🫘', 'snack', 'Fritéza', [
    'Cizrna sterilovaná|1 plechovka', 'Olivový olej|1 lžíce', 'Sůl, paprika, koření|dle chuti',
  ], 'Cizrnu scedíme, osušíme, promícháme s olejem a kořením a upečeme ve fritéze dokřupava.'),
  r('Zeleninový salát', '🥗', 'snack', 'Bez vaření', [
    'Rajčata|2 ks', 'Okurka|1 ks', 'Paprika|1 ks', 'Olivový olej|1 lžíce', 'Citron|½ ks', 'Sůl|dle chuti',
  ], 'Zeleninu nakrájíme na kousky, smícháme s olejem, citronovou šťávou a solí.'),
  r('Tortilla s čímkoliv', '🌯', 'snack', 'Bez vaření', [
    'Tortilla pšeničná|2 ks', 'Náplň dle chuti (šunka, sýr, zelenina)|dle chuti',
  ], 'Tortillu naplníme čímkoliv, co máme po ruce, a zabalíme.'),
  r('Slunečnicová semínka', '🌻', 'snack', 'Bez vaření', ['Slunečnicová semínka|50 g'], 'Hrst slunečnicových semínek podáváme jako rychlou svačinu.'),
  r('Nejlepší potraviny', '⭐', 'snack', 'Bez vaření', [
    'Cuketa|dle potřeby', 'Meloun|dle potřeby', 'Vaječné bílky|dle potřeby', 'Žampiony|dle potřeby', 'Jahody|dle potřeby', 'Okurka|dle potřeby', 'Konjakové těstoviny|dle potřeby', 'Kysané zelí|dle potřeby', 'Dýně|dle potřeby', 'Jogurt|dle potřeby', 'Skyr|dle potřeby', 'Listová zelenina (špenát, polníček, rukola)|dle potřeby', 'Brambory|dle potřeby',
  ], 'Přehled nejlepších potravin na hubnutí: cuketa, meloun, bílky, žampiony, jahody, okurka, konjakové těstoviny, kysané zelí, dýně, jogurt, skyr, listová zelenina (špenát, polníček, rukola) a vařené brambory. Dají se jíst často a hodí se jako základ jídel i svačin.'),

  // ===== VEČEŘE =====
  // Polévky
  r('Krémová houbová polévka', '🍄', 'dinner', 'Vaření', [
    'Houby (žampiony)|300 g', 'Cibule|1 ks', 'Mrkev|1 ks', 'Máslo|2 lžíce', 'Česnek|2 stroužky', 'Mouka hladká|1 lžíce', 'Vývar|600 ml', 'Smetana na vaření|100 ml', 'Sůl, pepř, paprika|dle chuti', 'Sýr na posypání|volitelně',
  ], 'Na másle osmahneme cibuli a mrkev, přidáme houby a koření (pepř, sůl, papriku, česnek). Zaprášíme moukou a zalijeme vývarem. Pak přidáme smetanu, na posypání může být sýr.'),
  r('Květáková polévka', '🥦', 'dinner', 'Pečení + mixování', [
    'Květák|1 ks', 'Česnek|3 stroužky', 'Brambory|2 ks', 'Cizrna sterilovaná|½ plechovky', 'Vývar|500 ml', 'Červená cibule|1 ks', 'Smetana na vaření|100 ml', 'Sůl, pepř|dle chuti',
  ], 'Na plechu upečeme květák a česnek (můžeme k tomu dát i brambory). Poté vše dáme do mixéru s cizrnou, vývarem a cibulí (ideálně červenou), může se přidat jakákoliv zelenina. Přendáme do hrnce, dochutíme a přidáme smetanu (případně mléko).'),
  r('Pečená zeleninová polévka', '🍅', 'dinner', 'Pečení + mixování', [
    'Paprika|2 ks', 'Cibule|1 ks', 'Mrkev|2 ks', 'Rajčata|3 ks', 'Česnek|1 hlavička', 'Celer nebo květák|1 kousek', 'Bazalka|dle chuti', 'Tymián|dle chuti', 'Zeleninový bujón|1 kostka', 'Sůl, pepř|dle chuti',
  ], 'Na plechu upečeme papriku, cibuli, mrkev, rajčata a celý česnek, může být i kousek celeru nebo květák, vlastně jakákoliv zelenina. Přidáme bazalku, sůl, pepř a tymián a pečeme asi půl hodiny. Vše rozmixujeme v horké vodě s bujónem.'),
  r('Rajčatová polévka s cottage', '🍅', 'dinner', 'Pečení + mixování', [
    'Rajčata|600 g', 'Česnek|3 stroužky', 'Cibule|1 ks', 'Olej|2 lžíce', 'Cottage sýr nebo smetana|100 g', 'Bazalka|dle chuti', 'Koření|dle chuti', 'Voda|300 ml',
  ], 'Na plech dáme rajčata, česnek, cibuli, koření a olej a zapečeme na 180 °C asi 30 minut. Poté dáme do mixéru s vodou a cottage sýrem (nebo smetanou), aby byla polévka krémová, a přidáme bazalku.'),
  r('Zeleninová krémová polévka', '🥕', 'dinner', 'Vaření + mixování', [
    'Cibule|1 ks', 'Mrkev|2 ks', 'Celer|100 g', 'Česnek|2 stroužky', 'Brambory|2 ks', 'Květák|200 g', 'Vývar|700 ml', 'Olej|1 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Na pánvi osmažíme cibuli, mrkev, celer a česnek, pak přidáme nakrájené brambory a květák. Zalijeme vývarem a necháme změknout. Poté polévku rozmixujeme.'),
  r('Čočková polévka', '🥣', 'dinner', 'Vaření', [
    'Čočka|150 g', 'Cibule|1 ks', 'Mrkev|1 ks', 'Brambory|2 ks', 'Uzené maso nebo slanina|100 g', 'Voda nebo vývar|1 l', 'Sůl, pepř, majoránka|dle chuti',
  ], 'Osmahneme cibuli, mrkev, brambory a nějaké maso. Přidáme čočku, zalijeme vodou nebo vývarem a necháme změknout. Dokořeníme.'),
  r('Kuřecí polévka se zeleninou', '🍲', 'dinner', 'Vaření', [
    'Cibule|1 ks', 'Kuřecí maso|250 g', 'Celer|100 g', 'Petržel kořenová|1 ks', 'Mrkev|2 ks', 'Česnek|2 stroužky', 'Vývar|1 l', 'Sůl, pepř|dle chuti',
  ], 'Osmahneme cibuli, maso, celer, petržel, mrkev a česnek. Necháme změknout a přidáme vývar.'),
  r('Hovězí polévka', '🍲', 'dinner', 'Vaření', [
    'Hovězí maso|250 g', 'Cibule|1 ks', 'Česnek|2 stroužky', 'Celer|100 g', 'Petržel kořenová|1 ks', 'Mrkev|2 ks', 'Hovězí bujón|1 kostka', 'Voda|1 l', 'Koření|dle chuti',
  ], 'Osmažíme maso, cibuli a česnek. Přidáme celer, petržel, mrkev, koření a bujón, zalijeme vodou a vaříme do změknutí.'),
  r('Pórková polévka', '🥬', 'dinner', 'Vaření', [
    'Pórek|2 ks', 'Brambory|3 ks', 'Cibule|1 ks', 'Máslo|1 lžíce', 'Vývar|800 ml', 'Smetana na vaření|100 ml', 'Sůl, pepř|dle chuti',
  ], 'Na másle osmahneme cibuli a pórek nakrájený na kolečka. Přidáme nakrájené brambory, zalijeme vývarem a vaříme do změknutí. Dochutíme solí a pepřem, případně rozmixujeme a dolijeme smetanou.'),
  r('Česnečka', '🧄', 'dinner', 'Vaření', [
    'Česnek|1 hlavička', 'Brambory|2 ks', 'Vývar|800 ml', 'Kmín|1 lžička', 'Majoránka|1 lžička', 'Sýr strouhaný|40 g', 'Chléb nebo opečené krutony|2 plátky', 'Sůl|dle chuti',
  ], 'Brambory uvaříme ve vývaru s kmínem a majoránkou do změknutí. Přidáme prolisovaný česnek a krátce povaříme. Podáváme s krutony a sýrem.'),
  r('Cibulačka', '🧅', 'dinner', 'Vaření', [
    'Cibule|4 ks', 'Máslo|2 lžíce', 'Vývar|800 ml', 'Kmín|1 lžička', 'Chléb|2 plátky', 'Eidam strouhaný|60 g', 'Sůl, pepř|dle chuti',
  ], 'Cibuli nakrájenou na tenká kolečka pomalu zpěníme na másle dozlatova. Zalijeme vývarem, přidáme kmín, sůl a pepř a vaříme asi 20 minut. Podáváme s opečeným chlebem a sýrem.'),
  r('Polévka s párky a bramborami', '🌭', 'dinner', 'Vaření', [
    'Brambory|4 ks', 'Párky|3 ks', 'Cibule|1 ks', 'Mrkev|1 ks', 'Česnek|2 stroužky', 'Voda nebo vývar|1 l', 'Majoránka, sůl, pepř|dle chuti',
  ], 'Cibuli, mrkev a brambory nakrájíme a krátce osmahneme. Zalijeme vodou nebo vývarem, přidáme česnek a koření a vaříme do změknutí brambor. Na konci přidáme nakrájené párky a krátce povaříme.'),
  r('Mrkvová polévka s pestem', '🥕', 'dinner', 'Pečení + mixování', [
    'Mrkev s natí|600 g', 'Cibule|1 ks', 'Česnek|3 stroužky', 'Petržel|1 hrst', 'Kešu oříšky|30 g', 'Olivový olej|3 lžíce', 'Citron|½ ks', 'Sýr strouhaný|30 g', 'Koření|dle chuti',
  ], 'Špalíčky mrkve dáme do pekáče spolu s cibulí a česnekem a pečeme do měkka. Pak rozmixujeme do hladka a dokořeníme. Navrch dáme pesto z lístků natě z mrkve, petržele, kešu oříšků, olivového oleje, citronové šťávy, sýra a koření.'),
  r('Brokolicová polévka se smetanou', '🥦', 'dinner', 'Vaření + mixování', [
    'Brokolice|500 g', 'Česnek|2 stroužky', 'Cibule|1 ks', 'Masox nebo bujón|1 kostka', 'Smetana na vaření|100 ml', 'Voda|600 ml', 'Sůl, pepř|dle chuti',
  ], 'Osmažíme společně česnek, cibuli a brokolicové košťály. Pak přidáme růžičky brokolice a masox, zalijeme vodou, uvaříme a rozmixujeme. Nakonec přidáme smetanu.'),
  r('Krémová zeleninová polévka s trhaným kuřetem', '🍲', 'dinner', 'Vaření + mixování', [
    'Brambory|3 ks', 'Cibule|1 ks', 'Mrkev|2 ks', 'Paprika|1 ks', 'Kuřecí prsa|300 g', 'Voda|1 l', 'Koření|dle chuti',
  ], 'Do hrnce dáme vařit nakrájené kusy brambor, cibule, mrkve a papriky (mohou být i rajčata nebo jiná zelenina). Navrch dáme kuřecí prsa vcelku, přidáme koření a necháme vše změknout. Kuře vyndáme a uděláme z něj trhané maso. Obsah hrnce rozmixujeme a přidáme zpět maso. Video: https://www.facebook.com/reel/1071509395624224/'),
  r('Vajíčková polévka', '🥚', 'dinner', 'Vaření', [
    'Kuřecí vývar|800 ml', 'Vejce|3 ks', 'Jarní cibulka|2 ks', 'Kukuřičný škrob|1 lžíce', 'Voda|50 ml', 'Sůl, pepř|dle chuti',
  ], 'Do kuřecího vývaru přidáme rozbitá a vyšlehaná vejce, jarní cibulku a kukuřičný škrob rozmíchaný ve vodě. Krátce povaříme.'),

  // Pomazánky
  r('Sýrová vajíčková pomazánka s cottage', '🥚', 'dinner', 'Bez vaření', [
    'Cottage sýr|200 g', 'Vejce|3 ks', 'Mrkev|1 ks', 'Kyselé okurky|2 ks', 'Červená cibule|¼ ks', 'Hořčice|1 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Vejce uvaříme natvrdo. Smícháme 200 g cottage, nastrouhanou mrkev, nakrájenou kyselou okurku (případně červenou cibuli a trochu láku z okurek), vejce a hořčici a dochutíme solí a pepřem.'),
  r('Tvarohová pomazánka s mrkví a celerem', '🥕', 'dinner', 'Bez vaření', [
    'Lučina nebo netučný tvaroh|150 g', 'Mrkev|1 ks', 'Celer|50 g', 'Majonéza|1 lžíce', 'Pažitka|1 hrst', 'Citronová šťáva|1 lžička', 'Sůl, pepř|dle chuti',
  ], 'Lučinu nebo netučný tvaroh smícháme s nastrouhanou mrkví a celerem, trochou majonézy, pažitkou a citronovou šťávou. Dochutíme solí a pepřem.'),
  r('Jogurtová pomazánka se šunkou', '🥛', 'dinner', 'Bez vaření', [
    'Bílý řecký jogurt|200 g', 'Jarní cibulka|2 ks', 'Červená cibule|¼ ks', 'Olej|1 lžička', 'Šunka|80 g', 'Sůl, pepř|dle chuti',
  ], 'Bílý řecký jogurt smícháme s jarní cibulkou, červenou cibulí, olejem, nakrájenou šunkou, solí a pepřem.'),
  r('Vajíčková pomazánka s jogurtem a cottage', '🥚', 'dinner', 'Vaření', [
    'Vejce|4 ks', 'Cottage sýr|100 g', 'Řecký jogurt|100 g', 'Jarní cibulka|2 ks', 'Sůl, pepř|dle chuti',
  ], 'Vajíčka uvaříme natvrdo, rozmačkáme a přidáme cottage, řecký jogurt a jarní cibulku nebo jinou cibuli. Dochutíme.'),
  r('Tuňáková pomazánka', '🐟', 'dinner', 'Vaření', [
    'Vejce|2 ks', 'Tuňák ve vlastní šťávě|1 plechovka', 'Červená cibule|¼ ks', 'Česnek|1 stroužek', 'Celer|30 g', 'Bílý řecký jogurt|3 lžíce', 'Sůl, pepř|dle chuti',
  ], 'Vejce uvaříme natvrdo. Smícháme je s tuňákem, cibulí (červenou nebo jarní), česnekem, celerem, solí a pepřem. Místo majonézy rozmícháme uvařené žloutky a řecký bílý jogurt.'),
  r('Zeleninová pomazánka s tuňákem', '🐟', 'dinner', 'Smažení', [
    'Cibule|1 ks', 'Párek|1 ks', 'Mrkev|1 ks', 'Tuňák ve vlastní šťávě|1 plechovka', 'Vejce|2 ks', 'Lahůdková cibulka|2 lžíce', 'Hořčice nebo pomazánkové máslo|1 lžíce', 'Olej|1 lžíce',
  ], 'Na pánvi lehce osmahneme cibuli, párek, mrkev nebo jinou zeleninu. Pak přidáme tuňáka a vejce natvrdo, lahůdkovou cibulku a hořčici nebo jiný dip či pomazánkové máslo.'),

  // ===== SVAČINY – nápoje =====
  r('Večerní jablečný nápoj se skořicí a kurkumou', '🍏', 'afternoon_snack', 'Vaření', [
    'Zelené jablko|2 ks', 'Skořice celá|2 ks', 'Voda|300 ml', 'Kurkuma|1 lžíce',
  ], 'Do hrnce dáme jablko (na večer 2 jablka), 2 celé skořice, 300 ml vody a kurkumu. Prohnáme varem asi 5 minut (při větším množství povaříme 9 minut), přecedíme a vypijeme.'),
  r('Ranní odvar z limetky, zázvoru a hřebíčku', '🍋', 'afternoon_snack', 'Vaření', [
    'Limetka|1 ks', 'Pepř|1 lžíce', 'Hřebíček|1 lžíce', 'Zázvor|3 kousky', 'Voda|500 ml',
  ], 'Do hrnce dáme vodu, limetku nakrájenou na plátky, pepř, hřebíček a nakrájený zázvor. Vaříme a prohneme varem 3 až několik minut, scedíme a vypijeme ráno.'),
  r('Ranní zázvorový shot s limetkou', '🫚', 'afternoon_snack', 'Mixování', [
    'Limetka nebo citron|2 ks', 'Zázvor|1 větší kus', 'Jablko|1 ks', 'Voda|200 ml',
  ], 'Nakrájíme 2 limetky (nebo citron) a větší kus zázvoru, případně přidáme oloupané jablko na chuť. V mixéru zalijeme vodou a rozmixujeme, přecedíme a vypijeme ráno jako panáka na lačný žaludek.'),
  r('Zeleninový nápoj ráno i před spaním', '🥬', 'afternoon_snack', 'Mixování', [
    'Celer|2 kousky', 'Hlávkové zelí|100 g', 'Mrkev|1 ks', 'Okurka|1 ks', 'Citron|1 ks', 'Zázvor|1 kousek', 'Voda|200 ml',
  ], 'Všechny suroviny rozmixujeme (citron použijeme celý), přecedíme a vypijeme.'),
  r('Ovocný nápoj před jídlem', '🍊', 'afternoon_snack', 'Mixování', [
    'Pomeranč|1 ks', 'Jablko|1 ks', 'Banán|1 ks', 'Zázvor|1 kousek', 'Citron|½ ks', 'Voda|300 ml',
  ], 'Pomeranč, jablko, banán a zázvor nakrájíme na malé kousky, přidáme šťávu z citronu a v mixéru rozmixujeme s vodou. Pije se 3x denně 20 minut před jídlem.'),
  r('Čaj ze skořice a oregána', '🍵', 'afternoon_snack', 'Vaření', [
    'Voda|500 ml', 'Skořice celá|1 ks', 'Oregano|1 lžíce',
  ], 'Dáme vařit vodu se skořicí a oregánem, prohneme varem a vypijeme teplé.'),
  r('Smoothie z okurky, zázvoru a ananasu', '🥒', 'afternoon_snack', 'Mixování', [
    'Okurka|½ ks', 'Zázvor|1 kousek', 'Ananas|100 g', 'Citron|½ ks',
  ], 'Půlku okurky, nakrájený zázvor a ananas a půlku citronu rozmixujeme dohladka.'),
  r('Ranní chia nápoj s citronem a medem', '🍋', 'afternoon_snack', 'Bez vaření', [
    'Chia semínka|1 lžíce', 'Voda|250 ml', 'Citron nebo limetka|½ ks', 'Med|1 lžička', 'Skořice|1 špetka',
  ], 'Chia semínka dáme do sklenice s vodou a necháme nasáknout (alespoň 30 minut, nejlépe přes noc v lednici). Ráno přidáme šťávu z citronu nebo limetky, med a špetku skořice a vypijeme asi 30 minut před snídaní.'),
  r('Zelený nápoj na celý den', '🍏', 'afternoon_snack', 'Mixování', [
    'Okurka|½ ks', 'Celer|1 kousek', 'Jablko|1 ks', 'Zázvor|1 kousek', 'Citron|½ ks', 'Ananas|100 g', 'Voda|300 ml',
  ], 'Vodu, okurku, celer, jablko, zázvor, šťávu z citronu a ananas rozmixujeme a přecedíme. Pije se kdykoliv během dne.'),
  r('Kokosová voda', '🥥', 'afternoon_snack', 'Bez vaření', ['Kokosová voda|1 balení'], 'Kokosovou vodu z obchodu dobře vychlazenou podáváme ve sklenici.'),
  r('Spalovač tuků z koření', '🔥', 'afternoon_snack', 'Bez vaření', [
    'Skořice mletá|1 lžička', 'Kurkuma mletá|1 lžička', 'Černý pepř mletý|1 lžička', 'Zázvor mletý|1 lžička', 'Horká voda|250 ml',
  ], 'Smícháme ve stejném poměru skořici, kurkumu, černý pepř a zázvor (vše v prášku). Z této směsi 1/4 lžičky zalijeme horkou vodou a vypijeme ráno nalačno nebo večer před spaním.'),
  r('Ranní horká voda s okurkou a octem', '🥒', 'afternoon_snack', 'Bez vaření', [
    'Okurka|¼ ks', 'Citron|½ ks', 'Růžová sůl|1 špetka', 'Jablečný ocet|1 lžíce', 'Horká voda|300 ml',
  ], 'Do horké vody dáme plátky okurky, šťávu z citronu, růžovou sůl a lžíci jablečného octa. Pije se před snídaní, hlavně po víkendu plném jídla a pití.'),
  r('Shot před cvičením', '🍋', 'afternoon_snack', 'Bez vaření', [
    'Citron|½ ks', 'Olivový olej|½ lžíce', 'Pepř|dle chuti', 'Jablečný ocet|1 lžička', 'Růžová sůl|1 špetka', 'Kurkuma|1 špetka',
  ], 'Šťávu z půlky citronu smícháme s půlkou lžíce olivového oleje, trochou pepře, jablečným octem, růžovou solí a kurkumou a vypijeme.'),
  r('Kiwi smoothie s okurkou a lnem', '🥝', 'afternoon_snack', 'Mixování', [
    'Kiwi|2 ks', 'Okurka|1 kousek', 'Citron|½ ks', 'Voda|200 ml', 'Lněná semínka|1 lžíce',
  ], 'Kiwi, kousek okurky, šťávu z citronu, vodu a lněná semínka rozmixujeme. Necedíme, vypijeme.'),
  r('Smoothie s pomerančem, celerem a jahodami', '🍓', 'afternoon_snack', 'Mixování', [
    'Pomeranč|1 ks', 'Řapíkatý celer|1 stonek', 'Jablko|1 ks', 'Jahody|100 g', 'Citron|½ ks', 'Voda|200 ml', 'Lněná semínka|1 lžíce',
  ], 'Pomeranč, celer, jablko, jahody, citronovou šťávu, vodu a lněné semínko rozmixujeme. Necedíme, vypijeme.'),
  r('Mrkvovo-okurkový nápoj', '🥕', 'afternoon_snack', 'Mixování', [
    'Mrkev|2 ks', 'Okurka|½ ks', 'Citron|½ ks', 'Voda|200 ml',
  ], 'Mrkev, okurku, citron a vodu rozmixujeme. Pije se kdykoliv přes den nebo ráno.'),
];

export default MealsList;
