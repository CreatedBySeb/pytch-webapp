We use poetry to configure the Python environment for developing the
docs.  We are using Poetry v1.8.3.  Set up using:

    poetry install

which will cause *poetry* to create a virtual environment in a
``.venv`` folder.

Then

    poetry run sphinx-autobuild --re-ignore '/\.#' source build/html

will launch a live-reload server to view the results.
