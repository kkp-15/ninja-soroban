# index.html の inline script をすべて node --check で構文検査する（公開しない）
import re,subprocess,sys,tempfile,os
s=open(sys.argv[1] if len(sys.argv)>1 else 'index.html').read()
bad=0
for i,m in enumerate(re.findall(r'<script[^>]*>([\s\S]*?)</script>',s)):
    f=tempfile.NamedTemporaryFile('w',suffix='.js',delete=False);f.write(m);f.close()
    r=subprocess.run(['node','--check',f.name],capture_output=True,text=True);os.unlink(f.name)
    print(f'script {i}:','OK' if r.returncode==0 else 'NG\n'+r.stderr[:400]);bad+=r.returncode!=0
print('構文エラー',bad);sys.exit(1 if bad else 0)
