"""Publish only the website files using certificate-verified explicit FTPS."""
import ftplib
import os
from pathlib import Path
import ssl
import sys


def main():
    required = ('FTP_SERVER', 'FTP_USERNAME', 'FTP_PASSWORD', 'FTP_DIR')
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        for name in missing:
            print(f'::error::Missing repository secret: {name}', file=sys.stderr)
        return 1

    try:
        port = int(os.environ.get('FTP_PORT') or '21')
        if not 1 <= port <= 65535:
            raise ValueError('FTP_PORT must be between 1 and 65535')
        context = ssl.create_default_context()
        if os.environ.get('FTP_CA_CERT'):
            context.load_verify_locations(cadata=os.environ['FTP_CA_CERT'])
        with ftplib.FTP_TLS(context=context, timeout=30) as ftp:
            ftp.connect(os.environ['FTP_SERVER'], port)
            # FTP_TLS.login upgrades the control connection to TLS before sending credentials.
            ftp.login(os.environ['FTP_USERNAME'], os.environ['FTP_PASSWORD'])
            ftp.prot_p()  # Encrypt the data connection too.
            ftp.cwd(os.environ['FTP_DIR'])
            for filename in ('index.html', 'styles.css', 'script.js'):
                with open(filename, 'rb') as source:
                    ftp.storbinary(f'STOR {filename}', source)
                print(f'Uploaded {filename}')
            try:
                ftp.cwd('assets')
            except ftplib.error_perm:
                ftp.mkd('assets')
                ftp.cwd('assets')
            for path in sorted(Path('assets').glob('*')):
                if path.is_file():
                    with path.open('rb') as source:
                        ftp.storbinary(f'STOR {path.name}', source)
                    print(f'Uploaded assets/{path.name}')
        print('FTPS deployment completed.')
        return 0
    except (ftplib.Error, OSError, EOFError, ValueError) as exc:
        print(f'::error::FTPS deployment failed: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
