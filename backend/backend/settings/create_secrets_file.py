"""Run this script to create your secrets file"""
from pathlib import Path
from django.core.management.utils import get_random_secret_key


def create_secrets_file(values: dict):
    with open(Path(Path(__file__).parent, 'secrets.py'), 'w') as f:
        f.write(f"SECRET_KEY = '{get_random_secret_key()}'\n")
        for field_name, field_value in values.items():
            f.write(f"{field_name} = '{field_value}'\n")


def main():
    fields = {
        # put the names of secret fields that need values in here
    }
    values = {f : input(f'{f}: ') for f in fields}
    create_secrets_file(values)


if __name__ == '__main__':
    main()
