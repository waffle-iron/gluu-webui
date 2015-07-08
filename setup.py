"""
Gluu WebUI
----------
Web user interface for the Gluu cluster management
"""

from setuptools import setup

setup(
        name="Gluu-WebUI",
        version="0.1.2",
        url="https://github.com/GluuFederation/gluu-webui",
        license="MIT",
        author="Gluu",
        author_email="info@gluu.org",
        description="Web UI for the Gluu cluster management API",
        long_description=__doc__,
        packages=["gluuwebui"],
        include_package_data=True,
        zip_safe=False,
        install_requires=[
            "Flask",
            "itsdangerous",
            "Jinja2",
            "MarkupSafe",
            "mccabe",
            "requests",
            "Werkzeug"
            ],
        classifiers=[
            "Development Status :: 2 - Pre-Alpha",
            "Environment :: Web Environment",
            "Framework :: Flask",
            "Intended Audience :: Developers",
            "License :: OSI Approved",
            "License :: OSI Approved :: MIT License",
            "Operating System :: POSIX",
            "Operating System :: POSIX :: Linux",
            "Topic :: Internet",
            "Topic :: Internet :: WWW/HTTP",
            "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
            "Topic :: Software Development",
            "Topic :: Software Development :: Libraries",
            "Topic :: Software Development :: Libraries :: Python Modules",
            "Programming Language :: Python",
            "Programming Language :: Python :: 2",
            "Programming Language :: Python :: 2.7",
            ],
        entry_points={}
        )
