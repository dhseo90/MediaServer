#!/usr/bin/env python3
"""R144: 제품을 시작하지 않는 독립 기대값 기반 의존성 반례."""
import os
from pathlib import Path
import tempfile
import unittest
from recording_build_freshness import check, depfile, Unverified


class Fixture:
    def __init__(self, root):
        self.repo = Path(root).resolve()
        self.build = self.repo / 'build'
        self.build.mkdir()
        self.runtime = 'media_server_runtime'
        self.app = 'media_server'
        self.compiler = self.put('tools/c++')
        self.ar = self.put('tools/ar')
        self.ranlib = self.put('tools/ranlib')
        self.put('CMakeLists.txt')
        self.header = self.put('include/runtime.h')
        self.app_header = self.put('include/application only.h', when=6)
        self.shared = self.put('include/shared.h')
        self.observer = self.put('scripts/observer.cpp', when=10)
        self.external = self.put('sdk/lib.a')
        self.put('build/CMakeCache.txt', '\n'.join([
            'CMAKE_GENERATOR:INTERNAL=Unix Makefiles',
            'CMAKE_HOME_DIRECTORY:INTERNAL='+str(self.repo),
            'CMAKE_CACHEFILE_DIR:INTERNAL='+str(self.build),
            'CMAKE_CXX_COMPILER:FILEPATH='+str(self.compiler),
            *[k+':BOOL=ON' for k in self.keys()]]))
        self.put('build/Makefile')
        self.put('build/CMakeFiles/cmake.check_cache', when=2)
        self.put('build/CMakeFiles/Makefile.cmake', '\n'.join([
            'set(CMAKE_MAKEFILE_OUTPUTS "Makefile" "CMakeFiles/cmake.check_cache")',
            'set(CMAKE_MAKEFILE_DEPENDS "CMakeCache.txt" "'+str(self.repo/'CMakeLists.txt')+'")',
            'set(CMAKE_DEPEND_INFO_FILES '+ ' '.join('"CMakeFiles/'+t+'.dir/DependInfo.cmake"' for t in (self.runtime,self.app))+')']))
        for t in (self.runtime, self.app):
            d = 'CMakeFiles/'+t+'.dir/'
            source = self.put('src/'+t+'.cpp')
            obj = self.put('build/'+d+'unit.cpp.o', when=4 if t==self.runtime else 7)
            dependencies = [source,self.shared,self.header if t==self.runtime else self.app_header]
            self.put('build/'+d+'unit.cpp.o.d', self.escape(str(obj))+': \\\n  '+' \\\n  '.join(self.escape(str(p)) for p in dependencies)+'\n')
            self.put('build/'+d+'DependInfo.cmake', 'set(CMAKE_DEPENDS_DEPENDENCY_FILES "'+str(source)+'" "'+d+'unit.cpp.o" "gcc" "'+d+'unit.cpp.o.d")')
            self.put('build/'+d+'flags.make', '# compile CXX with '+str(self.compiler)+'\nCXX_DEFINES = '+' '.join('-D'+k+'=1' for k in self.keys())+'\nCXX_INCLUDES =\nCXX_FLAGS = -std=c++17\n')
            artifact = 'libmedia_server_runtime.a' if t==self.runtime else 'media_server'
            self.put('build/'+artifact, when=5 if t==self.runtime else 8)
            prerequisites = [d+'unit.cpp.o',d+'build.make',d+'link.txt']
            if t==self.app: prerequisites += ['libmedia_server_runtime.a',str(self.external)]
            self.put('build/'+d+'build.make', '\n'.join([
                'CMAKE_SOURCE_DIR = '+str(self.repo), 'CMAKE_BINARY_DIR = '+str(self.build),
                t+'_OBJECTS = "'+d+'unit.cpp.o"',t+'_EXTERNAL_OBJECTS =',
                '\t'+str(self.compiler)+' $(CXX_DEFINES) $(CXX_INCLUDES) $(CXX_FLAGS) -MF '+d+'unit.cpp.o.d -o '+d+'unit.cpp.o -c '+str(source),
                *[artifact+': '+p for p in prerequisites]])+'\n')
            link = (str(self.ar)+' qc '+artifact+' '+d+'unit.cpp.o\n'+str(self.ranlib)+' '+artifact+'\n' if t==self.runtime else
                    str(self.compiler)+' '+d+'unit.cpp.o -o media_server libmedia_server_runtime.a '+str(self.external)+'\n')
            self.put('build/'+d+'link.txt',link)

    @staticmethod
    def keys():
        return ['MEDIA_SERVER_USE_GSTREAMER','MEDIA_SERVER_USE_ONNXRUNTIME','MEDIA_SERVER_USE_SIGLIP2','MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE']

    @staticmethod
    def escape(s):
        return s.replace('\\','\\\\').replace('$','$$').replace(' ','\\ ').replace('#','\\#').replace(':','\\:')

    def put(self, name, data='fixture', when=1):
        p=self.repo/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(data);self.time(p,when);return p

    def time(self,p,when):
        os.utime(p,ns=(when*1_000_000_000,when*1_000_000_000))

    def path(self,target,name):
        return self.build/'CMakeFiles'/(target+'.dir')/name

    def run(self):
        return check(self.repo,self.build)


class FreshnessTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='media-server-r144-focused-')
        self.addCleanup(self.temp.cleanup)
        self.f=Fixture(self.temp.name)

    def rejects(self, change, expected):
        change()
        with self.assertRaisesRegex(Unverified,expected):self.f.run()

    def test_01_runtime_header_newer(self):
        self.rejects(lambda:self.f.time(self.f.header,5),'stale-product-build')

    def test_02_runtime_object_newer_archive(self):
        self.rejects(lambda:self.f.time(self.f.path(self.f.runtime,'unit.cpp.o'),6),'stale-product-build')

    def test_03_application_header_newer(self):
        self.rejects(lambda:self.f.time(self.f.app_header,8),'stale-product-build')

    def test_04_application_object_newer_executable(self):
        self.rejects(lambda:self.f.time(self.f.path(self.f.app,'unit.cpp.o'),9),'stale-product-build')

    def test_05_archive_newer_executable(self):
        self.rejects(lambda:self.f.time(self.f.build/'libmedia_server_runtime.a',9),'stale-product-build')

    def test_06_missing_inputs(self):
        for target,name in [(self.f.runtime,'unit.cpp.o.d'),(self.f.app,'unit.cpp.o'),(self.f.app,'DependInfo.cmake'),(self.f.app,'link.txt')]:
            p=self.f.path(target,name);b=p.read_bytes();s=p.stat();p.unlink()
            with self.assertRaisesRegex(Unverified,'missing-file'):self.f.run()
            p.write_bytes(b);os.utime(p,ns=(s.st_atime_ns,s.st_mtime_ns))
        for name in ('media_server','libmedia_server_runtime.a'):
            p=self.f.build/name;b=p.read_bytes();s=p.stat();p.unlink()
            with self.assertRaisesRegex(Unverified,'missing-file'):self.f.run()
            p.write_bytes(b);os.utime(p,ns=(s.st_atime_ns,s.st_mtime_ns))

    def test_07_changed_configuration(self):
        self.rejects(lambda:self.f.time(self.f.repo/'CMakeLists.txt',3),'stale-product-build')

    def test_07b_changed_flags(self):
        self.rejects(lambda:self.f.time(self.f.path(self.f.runtime,'flags.make'),5),'stale-product-build')

    def test_07c_mismatched_definition(self):
        p=self.f.path(self.f.app,'flags.make');p.write_text(p.read_text().replace('USE_GSTREAMER=1','USE_GSTREAMER=0'));self.f.time(p,1)
        with self.assertRaisesRegex(Unverified,'configuration-definition-mismatch'):self.f.run()

    def test_08_shared_header_only_application_current(self):
        self.rejects(lambda:self.f.time(self.f.shared,6),'stale-product-build')

    def test_09_application_only_header_r143(self):
        self.assertGreater(self.f.app_header.stat().st_mtime_ns,(self.f.build/'libmedia_server_runtime.a').stat().st_mtime_ns)
        self.assertEqual(self.f.run()['status'],'PASS_TARGET_AWARE_PREFLIGHT')

    def test_10_observer_not_product_dependency(self):
        self.assertEqual(self.f.run()['status'],'PASS_TARGET_AWARE_PREFLIGHT')
        self.f.time(self.f.observer,20)
        self.assertEqual(self.f.run()['status'],'PASS_TARGET_AWARE_PREFLIGHT')
        wrapper=(Path(__file__).parent/'verify_v450_recording_a_mixed.sh').read_text()
        self.assertLess(wrapper.index('recording_build_freshness.py'),wrapper.index('"$observer_script/recording_current_observer_native.cpp"'))
        self.assertIn('"$observer_run/catalog-instrumented.cpp"',wrapper)
        self.assertIn('"$observer_script/recording_process_metrics.cpp"',wrapper)
        # Once a source is a real compiler dependency, it is no longer exempt.
        p=self.f.path(self.f.app,'unit.cpp.o.d');p.write_text(p.read_text().rstrip()+' '+str(self.f.observer)+'\n')
        with self.assertRaisesRegex(Unverified,'stale-product-build'):self.f.run()

    def test_11_make_escaping(self):
        self.assertEqual(depfile('x\\ y.o: a\\ b.h \\\n c\\#d.h e$$f.h g\\:h.h\n'),('x y.o',['a b.h','c#d.h','e$f.h','g:h.h']))
        for s in ('x.o:','x.o a.h','x.o: a.h\ny.o: b.h','x.o: $(X)','x.o: bad\\q','x.o: a.h # ignored','x.o: bad\\'):
            with self.subTest(s=s),self.assertRaises(Unverified):depfile(s)

    def test_12_malformed_depfile(self):
        self.rejects(lambda:self.f.path(self.f.runtime,'unit.cpp.o.d').write_text('unparsed'),'malformed-depfile')

    def test_13_depfile_target_mismatch(self):
        p=self.f.path(self.f.runtime,'unit.cpp.o.d');p.write_text(str(self.f.build/'media_server')+': '+str(self.f.header))
        with self.assertRaisesRegex(Unverified,'depfile-target-mismatch'):self.f.run()

    def test_14_missing_link_dependency(self):
        self.rejects(lambda:self.f.external.unlink(),'missing-file')

    def test_15_newer_link_dependency(self):
        self.rejects(lambda:self.f.time(self.f.external,9),'stale-product-build')

    def test_16_unknown_link_input(self):
        p=self.f.path(self.f.app,'link.txt');p.write_text(p.read_text().strip()+' -lmissing\n');self.f.time(p,1)
        with self.assertRaisesRegex(Unverified,'unresolved-link-input'):self.f.run()

    def test_17_hash_binding(self):
        with self.assertRaisesRegex(Unverified,'binary-hash-mismatch'):check(self.f.repo,self.f.build,'0'*64)

    def test_18_missing_configuration(self):
        self.rejects(lambda:(self.f.build/'CMakeFiles/Makefile.cmake').unlink(),'missing-file')

    def test_19_missing_configuration_input_declaration(self):
        p=self.f.build/'CMakeFiles/Makefile.cmake'
        p.write_text(p.read_text().replace('"CMakeCache.txt"',''))
        self.f.time(p,1)
        with self.assertRaisesRegex(Unverified,'missing-configuration-input'):self.f.run()

    def test_20_missing_generation_output_declaration(self):
        p=self.f.build/'CMakeFiles/Makefile.cmake'
        p.write_text(p.read_text().replace('"Makefile"',''))
        self.f.time(p,1)
        with self.assertRaisesRegex(Unverified,'missing-generation-output'):self.f.run()


if __name__=='__main__':unittest.main(verbosity=2)
