"""Almost throwaway tool for comparing output of Sphinx before and
after an update.

Do "poetry run make html" under old packages, rename html within build
to html-0.  Update packages, repeat but renaming to html-1.

Within the build directory, run this script on each and diff the
results:

poetry run python ../../tools/compare_doc_html.py html-0 html-0a
poetry run python ../../tools/compare_doc_html.py html-1 html-1a
diff -Naur html-0a html-1a

This should produce no output.
"""

from bs4 import BeautifulSoup, Comment
from pathlib import Path
import sys, re

dir_0 = Path(sys.argv[1])
dir_1 = Path(sys.argv[2])

def soup_of_filepath(filepath):
    text = open(filepath, "rt").read()
    soup = BeautifulSoup(text, 'html.parser')
    return soup

re_vquery = re.compile(r"^(.*)\?(v|digest)=[0-9a-f]+$")

def remove_query_param(elt, attrname):
    if elt.get(attrname) is not None:
        if m := re_vquery.match(elt[attrname]):
            elt[attrname] = m.group(1)

def remove_attr(elt, attrname):
    if elt.get(attrname) is not None:
        del elt[attrname]

def isComment(s):
    return isinstance(s, Comment)

for filepath_0 in sorted(dir_0.rglob("*.html")):
    filepath_1 = dir_1 / Path(*filepath_0.parts[1:])
    filepath_1.parent.mkdir(parents=True, exist_ok=True)
    soup = soup_of_filepath(filepath_0)

    for elt in soup.find_all(string=isComment):
        if elt.string.startswith(" Generated with Sphinx"):
            elt.replace_with(Comment(" Generated with Sphinx "))

    for elt in soup.find_all("a", title="Link to this heading"):
        elt["title"] = "Permalink to this heading"
        elt.string = "#"

    for elt in soup.find_all("a", title="Link to this image"):
        elt["title"] = "Permalink to this image"
        elt.string = "#"

    for elt in soup.find_all("link"):
        remove_query_param(elt, "href")

    for elt in soup.find_all("html"):
        remove_attr(elt, "data-content_root")

    for elt in soup.find_all("script"):
        remove_attr(elt, "data-url_root")
        remove_attr(elt, "id")
        remove_query_param(elt, "src")

    filepath_1.write_text(soup.prettify())
