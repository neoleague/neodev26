Basically this app is my drag and drop way of making the django backend a little nicer.
It is designed to be completely independant, containing only generic tools and features. Currently contains:

-   **Request tester tool** -> Allows api request testing from within the Django backend. Requests are sent from
    whatever account you logged into the backend with. You may need to add exceptions to limits on your views,
    middleware, or if you're using security other than CXRF tokens.

-   **Table downloader (WIP)** -> Allows you to download tables of the models in your project from the browser, in
    either json or spreadsheet format.

-   **Basic exeption handler** -> Stops django from sending details about database crashes outside of the api.
    Hard-enable by putting 'EXCEPTION_HANDLER': '{APP NAME}.exceptions.global_django_exception_handler' in the
    REST_FRAMEWORK dictionary in conf/settings.py. Leave blank to soft-enable. Specify another exception
    handler to disable.

It also comes with a healthy amount of services.

-   **get_super_serializer** -> Returns a serializer for ALL fields of the specified model

-   **list_to_ordered_queryset*** -> Takes in a list of ID's, and returns a queryset ordered to match the list

-   **make_queryset** -> Turns a wide variety of datatypes into django querysets.

-   **optimize_queryset** -> Accepts an existing queryset and automatically applies select_related and prefetch_related
    for all relationships

-   **queryset_to_filetype (WIP)** -> Turns a queryset into specified filetype