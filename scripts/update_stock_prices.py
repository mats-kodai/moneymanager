"""8316.Tの日足終値をfinance_sheetの株価履歴に追記。個人データは出力しない。"""
import math
import os
import sys
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

HEADER = ['価格日', '銘柄', '終値', '取得日時']
TICKER = '8316.T'
RANGE = "'株価履歴'!A:D"
STAGE = 'startup'


def stage(name):
    global STAGE
    STAGE = name
    print(f'stock_update stage={name}', flush=True)


class UpdateError(RuntimeError):
    """Only fixed, non-sensitive diagnostic codes belong here."""



def price_rows(history, now, existing):
    rows = []
    cutoff = now.date() if now.hour >= 18 else now.date() - timedelta(days=1)
    for stamp, record in history.iterrows():
        date = stamp.date()
        key = (date.isoformat(), TICKER)
        close = float(record['Close'])
        if date > cutoff or key in existing or not math.isfinite(close) or close <= 0:
            continue
        rows.append([key[0], TICKER, close, now.isoformat()])
    return rows


def main():
    stage('import_yfinance')
    import yfinance as yf
    stage('import_requests')
    import requests
    stage('clock')
    now = datetime.now(ZoneInfo('Asia/Tokyo'))
    history = None
    stage('fetch_prices')
    for attempt in range(3):
        try:
            history = yf.Ticker(TICKER).history(period='1mo', interval='1d', auto_adjust=False, raise_errors=True)
            if not history.empty:
                break
        except Exception as exc:
            print(f'stock_update fetch_attempt={attempt + 1} error_type={type(exc).__name__}', flush=True)
        time.sleep(2 ** attempt)
    if history is None or history.empty:
        raise UpdateError('PRICE_FETCH_FAILED')
    stage('validate_freshness')
    if (now.date() - history.index[-1].date()).days > 7:
        raise UpdateError('PRICE_DATA_STALE')
    # 検証時はGoogle認証も書き込みも行わない。
    stage('validate_splits')
    if 'Stock Splits' in history and (history['Stock Splits'] != 0).any():
        raise UpdateError('STOCK_SPLIT_DETECTED')
    if '--check-only' in sys.argv:
        print('株価取得確認: 成功')
        return
    diagnose_only = '--diagnose-only' in sys.argv
    stage('validate_environment')
    if not os.environ.get('FINANCE_SPREADSHEET_ID') or not os.environ.get('GOOGLE_ACCESS_TOKEN'):
        raise UpdateError('REQUIRED_ENV_MISSING')
    spreadsheet_id = os.environ['FINANCE_SPREADSHEET_ID']
    token = os.environ['GOOGLE_ACCESS_TOKEN']
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {token}'})
    base = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}'
    def call(method, path, **kwargs):
        response = session.request(method, base + path, timeout=30, **kwargs)
        if not response.ok:
            # URL・応答本文にIDや個人データが含まれるためログに出さない。
            raise UpdateError(f'SHEETS_HTTP_{response.status_code}')
        return response.json()
    stage('sheets_metadata')
    metadata = call('GET', '', params={'fields': 'sheets.properties.title'})
    if not any(s['properties']['title'] == '株価履歴' for s in metadata.get('sheets', [])):
        if diagnose_only:
            raise UpdateError('PRICE_SHEET_MISSING')
        stage('sheets_create_sheet')
        call('POST', ':batchUpdate', json={'requests': [{'addSheet': {'properties': {'title': '株価履歴'}}}]})
    stage('sheets_read_values')
    values = call('GET', '/values/' + requests.utils.quote(RANGE, safe='')).get('values', [])
    stage('validate_header')
    if values and values[0] != HEADER:
        raise UpdateError('HEADER_MISMATCH')
    if not values:
        if diagnose_only:
            raise UpdateError('HEADER_MISSING')
        stage('sheets_write_header')
        call('PUT', '/values/' + requests.utils.quote("'株価履歴'!A1:D1", safe=''), params={'valueInputOption':'RAW'}, json={'values':[HEADER]})
    stage('prepare_rows')
    existing = {(str(r[0]).replace('/', '-'), str(r[1])) for r in values[1:] if len(r) >= 2}
    rows = price_rows(history, now, existing)
    if diagnose_only:
        stage('diagnosis_complete_read_only')
        print('株価・Sheets読み取り・列構成の確認が完了しました。書き込みは行っていません。')
        return
    if rows:
        stage('sheets_append_rows')
        call('POST', '/values/' + requests.utils.quote(RANGE, safe='') + ':append', params={'valueInputOption':'RAW', 'insertDataOption':'INSERT_ROWS'}, json={'values':rows})
    print('株価履歴の更新が完了しました。')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        code = str(exc) if isinstance(exc, UpdateError) else 'UNEXPECTED_ERROR'
        print(f'stock_update failed_stage={STAGE} error_type={type(exc).__name__} code={code}', file=sys.stderr, flush=True)
        print('株価更新に失敗しました。取得先・認証・シート構成を確認してください。既存値は削除していません。', file=sys.stderr)
        sys.exit(1)
