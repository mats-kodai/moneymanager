import importlib.util
import unittest
from datetime import datetime
from zoneinfo import ZoneInfo
import pandas as pd
spec = importlib.util.spec_from_file_location('prices', 'scripts/update_stock_prices.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
class PricesTest(unittest.TestCase):
    def test_duplicates_and_unfinished_day(self):
        history = pd.DataFrame({'Close':[4000,4100,4200,float('nan')], 'Stock Splits':[0,0,0,0]},index=pd.to_datetime(['2026-09-18','2026-09-21','2026-09-22','2026-09-23']))
        now = datetime(2026,9,22,12,tzinfo=ZoneInfo('Asia/Tokyo'))
        rows = module.price_rows(history,now,{('2026-09-18','8316.T')})
        self.assertEqual([r[0] for r in rows],['2026-09-21'])
        rows = module.price_rows(history,now.replace(hour=18),{('2026-09-18','8316.T')})
        self.assertEqual([r[0] for r in rows],['2026-09-21','2026-09-22'])
        self.assertEqual(module.price_rows(history,now.replace(hour=18),{(r[0],'8316.T') for r in rows}|{('2026-09-18','8316.T')}),[])
    def test_reviewed_split_restores_historical_basis(self):
        history = pd.DataFrame({'Close':[2000,2050,2070,2100], 'Stock Splits':[0,2,0,0]}, index=pd.to_datetime(['2026-09-28','2026-09-29','2026-09-30','2026-10-01']))
        now = datetime(2026,10,2,18,tzinfo=ZoneInfo('Asia/Tokyo'))
        rows = module.price_rows(history, now, {('2026-09-28','8316.T')})
        self.assertEqual([r[2] for r in rows], [4100,4140,2100])
        self.assertEqual(module.price_rows(history, now, {(r[0],'8316.T') for r in rows}|{('2026-09-28','8316.T')}), [])
    def test_unreviewed_split_is_blocked(self):
        history = pd.DataFrame({'Close':[2000], 'Stock Splits':[3]}, index=pd.to_datetime(['2026-09-29']))
        with self.assertRaisesRegex(module.UpdateError, 'UNREVIEWED_STOCK_SPLIT'):
            module.price_rows(history, datetime(2026,10,2,18), set())
    def test_missing_split_event_is_blocked(self):
        history = pd.DataFrame({'Close':[2000,2100], 'Stock Splits':[0,0]}, index=pd.to_datetime(['2026-09-28','2026-10-01']))
        with self.assertRaisesRegex(module.UpdateError, 'EXPECTED_SPLIT_MISSING'):
            module.price_rows(history, datetime(2026,10,2,18), set())
    def test_split_outside_window_needs_no_adjustment(self):
        history = pd.DataFrame({'Close':[2100], 'Stock Splits':[0]}, index=pd.to_datetime(['2026-10-02']))
        self.assertEqual(module.price_rows(history, datetime(2026,10,2,18), set())[0][2], 2100)
if __name__ == '__main__': unittest.main()
