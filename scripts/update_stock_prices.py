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
    import yfinance as yf
    import requests
    now = datetime.now(ZoneInfo('Asia/Tokyo'))
    history = None
    for attempt in range(3):
        try:
            history = yf.Ticker(TICKER).history(period='1mo', interval='1d', auto_adjust=False, raise_errors=True)
            if not history.empty:
                break
        except Exception:
            pass
        time.sleep(2 ** attempt)
    if history is None or history.empty:
        raise RuntimeError('株価取得に失敗しました。既存データは保持しています。')
    if (now.date() - history.index[-1].date()).days > 7:
        raise RuntimeError('株価データが古いため更新を停止しました。')
    # 検証時はGoogle認証も書き込みも行わない。
    if 'Stock Splits' in history and (history['Stock Splits'] != 0).any():
        raise RuntimeError('分割を検出しました。株数と価格の基準を確認してください。')
    if '--check-only' in sys.argv:
        print('株価取得確認: 成功')
        return
    spreadsheet_id = os.environ['FINANCE_SPREADSHEET_ID']
    token = os.environ['GOOGLE_ACCESS_TOKEN']
    session = requests.Session()
    session.headers.update({'Authorization': f'Bearer {token}'})
    base = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}'
    def call(method, path, **kwargs):
        response = session.request(method, base + path, timeout=30, **kwargs)
        if not response.ok:
            # URL・応答本文にIDや個人データが含まれるためログに出さない。
            raise RuntimeError(f'Sheets APIの処理に失敗しました (HTTP {response.status_code})。')
        return response.json()
    metadata = call('GET', '', params={'fields': 'sheets.properties.title'})
    if not any(s['properties']['title'] == '株価履歴' for s in metadata.get('sheets', [])):
        call('POST', ':batchUpdate', json={'requests': [{'addSheet': {'properties': {'title': '株価履歴'}}}]})
    values = call('GET', '/values/' + requests.utils.quote(RANGE, safe='')).get('values', [])
    if values and values[0] != HEADER:
        raise RuntimeError('株価履歴の列構成を確認してください。上書きは行っていません。')
    if not values:
        call('PUT', '/values/' + requests.utils.quote("'株価履歴'!A1:D1", safe=''), params={'valueInputOption':'RAW'}, json={'values':[HEADER]})
    existing = {(str(r[0]).replace('/', '-'), str(r[1])) for r in values[1:] if len(r) >= 2}
    rows = price_rows(history, now, existing)
    if rows:
        call('POST', '/values/' + requests.utils.quote(RANGE, safe='') + ':append', params={'valueInputOption':'RAW', 'insertDataOption':'INSERT_ROWS'}, json={'values':rows})
    print('株価履歴の更新が完了しました。')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('株価更新に失敗しました。取得先・認証・シート構成を確認してください。既存値は削除していません。', file=sys.stderr)
        sys.exit(1)
