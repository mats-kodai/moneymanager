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
        history = pd.DataFrame({'Close':[4000,4100,4200,float('nan')]},index=pd.to_datetime(['2026-09-18','2026-09-21','2026-09-22','2026-09-23']))
        now = datetime(2026,9,22,12,tzinfo=ZoneInfo('Asia/Tokyo'))
        rows = module.price_rows(history,now,{('2026-09-18','8316.T')})
        self.assertEqual([r[0] for r in rows],['2026-09-21'])
        rows = module.price_rows(history,now.replace(hour=18),{('2026-09-18','8316.T')})
        self.assertEqual([r[0] for r in rows],['2026-09-21','2026-09-22'])
        self.assertEqual(module.price_rows(history,now.replace(hour=18),{(r[0],'8316.T') for r in rows}|{('2026-09-18','8316.T')}),[])
if __name__ == '__main__': unittest.main()
