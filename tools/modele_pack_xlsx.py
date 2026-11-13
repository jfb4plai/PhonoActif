# -*- coding: utf-8 -*-
"""Modèle Excel « pack de mots » pour l'enseignant, et lecteur du modèle rempli (option (a) du 2026-11-13 : JF ou un admin fabrique le pack).

  python -I tools/modele_pack_xlsx.py creer [sortie.xlsx]
      écrit le modèle (par défaut public/modeles/modele-pack-plai.xlsx)
  python -I tools/modele_pack_xlsx.py lire <modele-rempli.xlsx> [--images <dossier>] [--remplacer]
      vérifie le tableau, copie les images dans public/packs/<nom>/images/ et écrit data/packs-atelier/<nom>/pack.json
      puis, pour le reste de la chaîne : node tools/construire_pack_atelier.js <nom>   (voir docs/fabriquer-un-pack.md)

Le lecteur ne fait aucune requête réseau. Les problèmes de mots ou d'images ne bloquent pas : le mot ou l'image concerné est ignoré et signalé.
Seuls les problèmes de la feuille « Pack » (nom, utilisation, e-mail) et l'absence de tout mot valide bloquent.
"""
import json
import pathlib
import re
import shutil
import sys
import unicodedata

import openpyxl
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

RACINE = pathlib.Path(__file__).resolve().parent.parent
TEAL, ORANGE = "0F6E56", "F97316"
FEUILLE_PACK, FEUILLE_MOTS, FEUILLE_NOTICE = "Pack", "Mots", "Mode d'emploi"
UTILISATIONS = ["pour mon usage", "à partager avec tous"]
NIVEAUX = ["P1", "P2", "P3", "P4", "P5", "P6"]
EXTENSIONS_IMAGE = {".png", ".jpg", ".jpeg", ".svg", ".webp"}
MOT_OK = re.compile(r"^[a-zàâäçéèêëîïôöùûüÿœæ]{2,12}$")
NOM_OK = re.compile(r"^[a-z0-9][a-z0-9-]{2,39}$")
COURRIEL_OK = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
CONTACT = "jeanfrancois.beguin@ens.ecl.be"

# (clé, titre de colonne, exemple concret, texte d'aide sous le champ)
COLONNES = [
    ("mot", "Mot", "chat", "Un seul mot par ligne, en lettres (2 à 12), sans espace ni apostrophe. Il sera lu lettre par lettre par la voix de l'application."),
    ("niveau", "Niveau", "P1", "Niveau visé (P1 à P6). Sert à classer les mots ; il ne change pas la lecture."),
    ("image", "Image (nom du fichier)", "chat.png", "Nom exact du fichier image que vous envoyez avec ce tableau (png, jpg, svg ou webp). Laisser vide si le mot n'a pas d'image : l'élève verra alors le mot ou entendra la consigne."),
    ("image_mot", "Image avec le mot (nom du fichier, facultatif)", "chat-mot.png", "Même image avec le mot écrit dessus, pour les cartes « avec le mot ». Facultatif : sans elle, l'application affiche le mot en texte."),
    ("source", "Source de l'image", "Dessin de l'enseignant", "D'où vient l'image : qui l'a faite ou où elle a été trouvée. Obligatoire si vous donnez une image, sinon elle est ignorée."),
    ("licence", "Licence de l'image", "propre", "Droit d'utilisation : « propre » si l'image est la vôtre, sinon la licence (par exemple CC BY 4.0). Obligatoire si vous donnez une image."),
    ("phrase", "Phrase d'aide (facultatif)", "Le chat dort sur le tapis.", "Courte phrase contenant le mot, 140 caractères au plus. Elle servira plus tard d'aide pour les mots sans image."),
    ("commentaire", "Commentaire", "", "Pour vous : une remarque libre. Les lignes dont le commentaire commence par EXEMPLE ou AIDE sont ignorées."),
]
CHAMPS_PACK = [
    ("nom", "Nom du pack", "classe-3b-animaux", "Nom court sans espace ni accent : lettres minuscules, chiffres et tirets (3 à 40 caractères). Il identifie le pack dans l'application."),
    ("titre", "Titre affiché", "Les animaux de la classe de 3B", "Le titre que verront les enseignants dans la liste des packs (80 caractères au plus)."),
    ("utilisation", "Utilisation", "pour mon usage", "« pour mon usage » : seul votre compte voit ce pack. « à partager avec tous » : après relecture, tous les enseignants le voient."),
    ("courriel", "E-mail de votre compte PLAI", "prenom.nom@exemple.be", "Obligatoire pour « pour mon usage » : c'est lui qui vous fait voir le pack dans votre espace enseignant. Utilisez l'adresse avec laquelle vous vous connectez. Elle n'est pas publiée en clair."),
]


def sans_accent(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s).casefold()) if unicodedata.category(c) != "Mn")


# ------------------------------------------------------------------ création du modèle
def creer_modele(chemin):
    wb = openpyxl.Workbook()
    arial = Font(name="Arial", size=12)
    gras = Font(name="Arial", size=12, bold=True)
    entete = Font(name="Arial", size=12, bold=True, color="FFFFFF")
    fond_entete = PatternFill("solid", fgColor=TEAL)
    fond_aide = PatternFill("solid", fgColor="F3F4F6")
    fond_exemple = PatternFill("solid", fgColor="FFF7ED")
    gris = Font(name="Arial", size=11, italic=True, color="4B5563")
    retour = Alignment(wrap_text=True, vertical="top")

    # --- Mode d'emploi
    n = wb.active
    n.title = FEUILLE_NOTICE
    n.column_dimensions["A"].width = 110
    lignes = [
        ("Modèle de pack PLAI : vos mots et vos images", "t"),
        ("Ce que vous préparez : une liste de mots et, si vous le souhaitez, une image par mot. L'application fait entendre chaque mot lettre par lettre, avec une voix belge de synthèse.", ""),
        ("1. Feuille « Pack » : donnez un nom court et un titre, puis choisissez « pour mon usage » ou « à partager avec tous ».", ""),
        ("2. Feuille « Mots » : un mot par ligne. Les lignes grises (AIDE) et orange (EXEMPLE) sont ignorées : vous pouvez les laisser ou les supprimer.", ""),
        ("3. Images : un fichier par mot, rangé dans un dossier à part, avec exactement le nom écrit dans le tableau. Un seul objet, fond uni, sans texte, sans visage. Indiquez toujours la source et la licence : sans elles, l'image est ignorée.", ""),
        (f"4. Envoyez le tableau et le dossier d'images à JF ({CONTACT}). JF prépare le pack : voix, vérifications et publication.", ""),
        ("5. Aucun nom d'élève ni donnée personnelle dans ce fichier.", ""),
        ("", ""),
        ("« Pour mon usage » : le pack n'apparaît que dans votre espace enseignant (adresse e-mail de votre compte PLAI). Votre adresse n'est pas publiée en clair (seule une empreinte l'est). Ce n'est pas un coffre-fort : une personne qui connaîtrait l'adresse exacte du pack pourrait l'ouvrir. N'y mettez rien de confidentiel.", ""),
        ("« À partager avec tous » : le pack est relu par JF et un autre administrateur pour la cohérence graphique, puis proposé à tous les enseignants.", ""),
        ("", ""),
        ("Ce que l'application ne sait pas faire pour l'instant", "h"),
        ("Un mot absent du lexique de lecture (pluriel, forme conjuguée, nom propre, mot rare) est mis de côté tant que JF ne l'a pas vérifié : il vous le dira.", ""),
        ("La lecture automatique juste est mesurée sur des mots du lexique ; elle n'est pas garantie pour d'autres. JF écoute et valide avant diffusion.", ""),
        ("Les phrases d'aide sont conservées pour plus tard : elles ne sont pas encore lues par l'application.", ""),
    ]
    for i, (texte, genre) in enumerate(lignes, start=1):
        c = n.cell(row=i, column=1, value=texte)
        c.alignment = retour
        c.font = Font(name="Arial", size=16, bold=True, color=TEAL) if genre == "t" else (Font(name="Arial", size=13, bold=True, color=TEAL) if genre == "h" else arial)

    # --- Pack
    p = wb.create_sheet(FEUILLE_PACK)
    for col, larg in zip("ABCD", (34, 44, 38, 100)):
        p.column_dimensions[col].width = larg
    for j, titre in enumerate(("Champ", "Votre réponse", "Exemple", "À quoi ça sert"), start=1):
        c = p.cell(row=1, column=j, value=titre)
        c.font, c.fill, c.alignment = entete, fond_entete, retour
    for i, (cle, titre, exemple, aide) in enumerate(CHAMPS_PACK, start=2):
        p.cell(row=i, column=1, value=titre).font = gras
        p.cell(row=i, column=2).font = arial
        p.cell(row=i, column=2).fill = PatternFill("solid", fgColor="FFFBEB")
        e = p.cell(row=i, column=3, value=exemple)
        e.font = gris
        a = p.cell(row=i, column=4, value=aide)
        a.font = gris
        for col in (1, 2, 3, 4):
            p.cell(row=i, column=col).alignment = retour
        p.row_dimensions[i].height = 48
    dv = DataValidation(type="list", formula1='"' + ",".join(UTILISATIONS) + '"', allow_blank=False, showErrorMessage=True,
                        errorTitle="Valeur non prévue", error="Choisir dans la liste : « pour mon usage » ou « à partager avec tous ».")
    p.add_data_validation(dv)
    dv.add("B4")
    p.freeze_panes = "A2"

    # --- Mots
    m = wb.create_sheet(FEUILLE_MOTS)
    larges = (18, 10, 26, 30, 30, 22, 44, 34)
    for j, (col, larg) in enumerate(zip("ABCDEFGH", larges), start=1):
        m.column_dimensions[col].width = larg
    for j, (cle, titre, exemple, aide) in enumerate(COLONNES, start=1):
        c = m.cell(row=1, column=j, value=titre)
        c.font, c.fill, c.alignment = entete, fond_entete, retour
        c.comment = Comment(aide, "PLAI")
        a = m.cell(row=2, column=j, value=aide if j < len(COLONNES) else "AIDE : ligne ignorée")
        a.font, a.fill, a.alignment = gris, fond_aide, retour
    m.cell(row=2, column=len(COLONNES), value="AIDE : cette ligne est ignorée")
    m.row_dimensions[1].height = 34
    m.row_dimensions[2].height = 120
    exemples = [
        ("chat", "P1", "chat.png", "chat-mot.png", "Dessin de l'enseignant", "propre", "Le chat dort sur le tapis.", "EXEMPLE : mot avec image"),
        ("lune", "P1", "", "", "", "", "", "EXEMPLE : mot sans image"),
        ("maison", "P2", "maison.png", "", "Dessin de l'enseignant", "propre", "", "EXEMPLE : image sans version avec le mot"),
    ]
    for i, ligne in enumerate(exemples, start=3):
        for j, v in enumerate(ligne, start=1):
            c = m.cell(row=i, column=j, value=v)
            c.font, c.fill, c.alignment = Font(name="Arial", size=12, color="7C2D12"), fond_exemple, retour
    for r in range(6, 106):
        for j in range(1, 9):
            m.cell(row=r, column=j).font = arial
    dv2 = DataValidation(type="list", formula1='"' + ",".join(NIVEAUX) + '"', allow_blank=True, showErrorMessage=True,
                         errorTitle="Niveau non prévu", error="Choisir P1, P2, P3, P4, P5 ou P6, ou laisser vide.")
    m.add_data_validation(dv2)
    dv2.add("B3:B105")
    m.freeze_panes = "A3"
    chemin = pathlib.Path(chemin)
    chemin.parent.mkdir(parents=True, exist_ok=True)
    wb.save(chemin)
    return chemin


# ------------------------------------------------------------------ lecture du modèle rempli
def _t(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def lire_modele(chemin, dossier_images=None):
    """Renvoie (pack, erreurs, avertissements). pack est None s'il y a une erreur bloquante."""
    erreurs, avertissements = [], []
    try:
        wb = openpyxl.load_workbook(chemin, read_only=True, data_only=True)
    except Exception as e:
        return None, [f"Fichier illisible : {e}"], []
    if FEUILLE_PACK not in wb.sheetnames or FEUILLE_MOTS not in wb.sheetnames:
        return None, [f"Feuilles « {FEUILLE_PACK} » et « {FEUILLE_MOTS} » attendues : utiliser le modèle fourni."], []

    # --- feuille Pack : lue par intitulé de champ (colonne A), valeur en colonne B
    valeurs = {}
    for r in wb[FEUILLE_PACK].iter_rows(min_row=2, values_only=True):
        if r and r[0] is not None:
            valeurs[sans_accent(_t(r[0]))] = _t(r[1]) if len(r) > 1 else ""
    nom = valeurs.get(sans_accent("Nom du pack"), "")
    titre = valeurs.get(sans_accent("Titre affiché"), "")
    usage = sans_accent(valeurs.get(sans_accent("Utilisation"), ""))
    courriel = valeurs.get(sans_accent("E-mail de votre compte PLAI"), "").lower()
    if not NOM_OK.match(nom):
        erreurs.append("Feuille Pack : « Nom du pack » absent ou invalide (minuscules, chiffres et tirets, 3 à 40 caractères, par exemple classe-3b-animaux).")
    if not titre or len(titre) > 80:
        erreurs.append("Feuille Pack : « Titre affiché » absent ou de plus de 80 caractères.")
    visibilite = None
    if usage == sans_accent(UTILISATIONS[0]):
        visibilite = "prive"
        if not COURRIEL_OK.match(courriel):
            erreurs.append("Feuille Pack : pour « pour mon usage », l'e-mail du compte PLAI est obligatoire (c'est lui qui rend le pack visible).")
    elif usage == sans_accent(UTILISATIONS[1]):
        visibilite = "commun"
    else:
        erreurs.append("Feuille Pack : « Utilisation » doit être « pour mon usage » ou « à partager avec tous ».")

    # --- feuille Mots : colonnes repérées par leur titre
    lignes = list(wb[FEUILLE_MOTS].iter_rows(values_only=True))
    entete = next((i for i, r in enumerate(lignes) if r and sans_accent(_t(r[0])) == "mot"), None)
    if entete is None:
        return None, erreurs + ["Feuille Mots : l'en-tête « Mot » est introuvable (ne pas déplacer ni renommer les colonnes)."], avertissements
    index = {}
    for j, titre_col in enumerate(lignes[entete]):
        t = sans_accent(_t(titre_col))
        for cle, nom_col, _, _ in COLONNES:
            if t == sans_accent(nom_col):
                index[cle] = j
    manquantes = [c[1] for c in COLONNES if c[0] not in index]
    if manquantes:
        return None, erreurs + [f"Feuille Mots : colonnes introuvables : {', '.join(manquantes)}."], avertissements

    cartes, vus = [], set()
    for k, r in enumerate(lignes[entete + 1:], start=entete + 2):
        def v(cle):
            return _t(r[index[cle]]) if index[cle] < len(r) else ""
        if all(_t(x) == "" for x in r):
            continue
        if sans_accent(v("commentaire")).startswith(("exemple", "aide")):
            continue
        mot = unicodedata.normalize("NFC", v("mot")).lower()
        if mot == "":
            avertissements.append(f"Ligne {k} : pas de mot, ligne ignorée.")
            continue
        if not MOT_OK.match(mot):
            avertissements.append(f"Ligne {k} : « {mot} » ignoré (lettres seulement, 2 à 12, ni espace ni apostrophe ni trait d'union).")
            continue
        if mot in vus:
            avertissements.append(f"Ligne {k} : « {mot} » déjà présent, doublon ignoré.")
            continue
        vus.add(mot)
        niveau = v("niveau").upper()
        if niveau and niveau not in NIVEAUX:
            avertissements.append(f"Ligne {k} ({mot}) : niveau « {niveau} » non prévu, laissé vide.")
            niveau = ""
        phrase = v("phrase")
        if len(phrase) > 140:
            avertissements.append(f"Ligne {k} ({mot}) : phrase de plus de 140 caractères, ignorée.")
            phrase = ""
        carte = {"mot": mot, "niveau": niveau, "image": "", "image_mot": "", "source": v("source"), "licence": v("licence"), "phrase": phrase, "commentaire": v("commentaire")}
        for cle in ("image", "image_mot"):
            nomf = v(cle)
            if not nomf:
                continue
            if pathlib.Path(nomf).suffix.lower() not in EXTENSIONS_IMAGE:
                avertissements.append(f"Ligne {k} ({mot}) : « {nomf} » n'a pas une extension d'image reconnue (png, jpg, svg, webp), image ignorée.")
                continue
            if "/" in nomf or "\\" in nomf:
                avertissements.append(f"Ligne {k} ({mot}) : « {nomf} » doit être un nom de fichier seul, sans dossier, image ignorée.")
                continue
            if not carte["source"] or not carte["licence"]:
                avertissements.append(f"Ligne {k} ({mot}) : source ou licence de l'image manquante, image ignorée.")
                continue
            if dossier_images is not None and not (pathlib.Path(dossier_images) / nomf).is_file():
                avertissements.append(f"Ligne {k} ({mot}) : fichier « {nomf} » introuvable dans le dossier d'images, image ignorée.")
                continue
            carte[cle] = nomf
        if carte["image_mot"] and not carte["image"]:
            avertissements.append(f"Ligne {k} ({mot}) : image avec le mot sans image simple, ignorée.")
            carte["image_mot"] = ""
        cartes.append(carte)
    if not cartes:
        erreurs.append("Feuille Mots : aucun mot valide.")
    if len(cartes) > 150:
        avertissements.append(f"{len(cartes)} mots : au-delà de 150, la fabrication audio est longue et coûteuse ; envisager de couper en deux packs.")
    if erreurs:
        return None, erreurs, avertissements
    pack = {"nom": nom, "titre": titre, "visibilite": visibilite, "proprietaire": courriel if visibilite == "prive" else "", "cartes": cartes}
    return pack, erreurs, avertissements


def ecrire_pack(pack, dossier_images, remplacer=False, racine=RACINE):
    """Copie les images dans public/packs/<nom>/images/ et écrit data/packs-atelier/<nom>/pack.json. Refuse d'écraser un pack existant sans --remplacer."""
    nom = pack["nom"]
    public = racine / "public" / "packs" / nom
    atelier = racine / "data" / "packs-atelier" / nom
    if (public.exists() or atelier.exists()) and not remplacer:
        raise FileExistsError(f"Le pack « {nom} » existe déjà : choisir un autre nom, ou relancer avec --remplacer.")
    (public / "images").mkdir(parents=True, exist_ok=True)
    atelier.mkdir(parents=True, exist_ok=True)
    for c in pack["cartes"]:
        for cle in ("image", "image_mot"):
            if c[cle]:
                shutil.copyfile(pathlib.Path(dossier_images) / c[cle], public / "images" / c[cle])
                c[cle] = f"images/{c[cle]}"
    (atelier / "pack.json").write_text(json.dumps(pack, ensure_ascii=False, indent=1), encoding="utf-8")
    return atelier / "pack.json"


def main(argv):
    if len(argv) >= 2 and argv[1] == "creer":
        sortie = pathlib.Path(argv[2]) if len(argv) > 2 else RACINE / "public" / "modeles" / "modele-pack-plai.xlsx"
        print("Modèle écrit :", creer_modele(sortie))
        return 0
    if len(argv) >= 3 and argv[1] == "lire":
        images = argv[argv.index("--images") + 1] if "--images" in argv else None
        pack, erreurs, avert = lire_modele(argv[2], images)
        for a in avert:
            print("avertissement :", a)
        if erreurs:
            for e in erreurs:
                print("ERREUR :", e)
            return 2
        try:
            chemin = ecrire_pack(pack, images, "--remplacer" in argv)
        except FileExistsError as e:
            print("ERREUR :", e)
            return 2
        print(f"{len(pack['cartes'])} mots retenus, pack « {pack['nom']} » ({pack['visibilite']}). Écrit : {chemin}")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
