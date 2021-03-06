# -*- coding: utf-8 -*-
import logging
LOG = logging.getLogger(__name__)

import subprocess

from django.http import HttpResponse, Http404
from django.views.generic import View

from braces.views import JSONResponseMixin

from .renderer import Renderer
from .featureinfo import FeatureInfo
from .project import SunlumoProject
from .utils import writeParamsToJson, str2bool, hex2rgb


class UpperParamsMixin(object):
    def dispatch(self, request, *args, **kwargs):
        self.req_params = {
            key.upper(): request.GET[key] for key in request.GET.keys()
        }
        return super(UpperParamsMixin, self).dispatch(
            request, *args, **kwargs
        )


class ProjectDetails(UpperParamsMixin, JSONResponseMixin, View):
    def _parse_request_params(self, request):
        if not(all(param in self.req_params for param in ['MAP'])):
            raise Http404

        try:
            map_file = self.req_params.get('MAP')
        except:
            # return 404 if any of parameters are missing or not parsable
            raise Http404

        # map must have a value
        if not(map_file):
            raise Http404

        params = {
            'map_file': map_file
        }

        return params

    def get(self, request, *args, **kwargs):
        params = self._parse_request_params(request)

        project = SunlumoProject(params['map_file'])

        return self.render_json_response(project.getDetails())


class GetMapView(UpperParamsMixin, JSONResponseMixin, View):
    def _parse_request_params(self, request):
        if not(all(param in self.req_params for param in [
                'BBOX', 'WIDTH', 'HEIGHT', 'MAP', 'SRS', 'FORMAT', 'LAYERS',
                'TRANSPARENCIES', 'REQUEST'])):
            raise Http404

        try:
            request = self.req_params.get('REQUEST')
            bbox = [float(a) for a in self.req_params.get('BBOX').split(',')]
            image_size = [
                int(a) for a in (
                    self.req_params.get('WIDTH'),
                    self.req_params.get('HEIGHT'))
            ]
            srs = int(self.req_params.get('SRS').split(':')[-1])
            image_format = self.req_params.get('FORMAT').split('/')[-1]
            transparent = str2bool(self.req_params.get('TRANSPARENT', False))
            map_file = self.req_params.get('MAP')
            bgcolor = hex2rgb(self.req_params.get('BGCOLOR', '0xFFFFFF'))
            layers = [
                layer.strip()
                for layer in self.req_params.get('LAYERS').split(',')
            ]
            if self.req_params.get('QUERY_LAYERS'):
                query_layers = [
                    layer.strip()
                    for layer in self.req_params.get('QUERY_LAYERS').split(',')
                ]
            else:
                query_layers = []
            if self.req_params.get('X') and self.req_params.get('Y'):
                click_point = [
                    int(self.req_params.get('X')),
                    int(self.req_params.get('Y'))
                ]
            else:
                click_point = []
            transparencies = [
                int(a)
                for a in self.req_params.get('TRANSPARENCIES').split(',')
                if len(a) > 0
            ]
        except:
            # return 404 if any of parameters are missing or not parsable
            raise Http404

        # map must have a value
        if not(map_file) or not(request):
            raise Http404

        # check if image format is supported
        if image_format not in ['png', 'jpeg', 'png8']:
            raise Http404

        params = {
            'bbox': bbox,
            'image_size': image_size,
            'map_file': map_file,
            'srs': srs,
            'image_format': image_format,
            'transparent': transparent,
            'bgcolor': bgcolor,
            'layers': layers,
            'transparencies': transparencies,
            'request': request,
            'query_layers': query_layers,
            'click_point': click_point
        }

        return params

    def get(self, request, *args, **kwargs):
        params = self._parse_request_params(request)

        if params.get('request') == 'GetMap':
            sl_project = Renderer(params.get('map_file'))
            img = sl_project.render(params)

            return HttpResponse(img, content_type=params.get('image_format'))
        else:
            sl_project = FeatureInfo(params.get('map_file'))
            features = sl_project.identify(params)

            return self.render_json_response(features)


class PrintPDFView(UpperParamsMixin, View):
    def _parse_request_params(self, request):
        if not(all(param in self.req_params for param in [
                'BBOX', 'LAYOUT', 'MAP', 'LAYERS', 'TRANSPARENCIES'])):
            raise Http404

        try:
            bbox = [float(a) for a in self.req_params.get('BBOX').split(',')]
            layers = [
                layer.strip()
                for layer in self.req_params.get('LAYERS').split(',')
            ]
            layout = self.req_params.get('LAYOUT')
            map_file = self.req_params.get('MAP')
            transparencies = [
                int(a)
                for a in self.req_params.get('TRANSPARENCIES').split(',')
                if len(a) > 0
            ]
        except:
            # return 404 if any of parameters are missing or not parsable
            raise Http404

        if not(layout) or not(map_file):
            # composer template should not be empty
            raise Http404

        return {
            'bbox': bbox,
            'layout': layout,
            'map_file': map_file,
            'layers': layers,
            'transparencies': transparencies
        }

    def get(self, request, *args, **kwargs):

        params = self._parse_request_params(request)

        tmpFile = writeParamsToJson(params)

        # printing requires a subprocess call
        proc = subprocess.call(['python', 'manage.py', 'print_map', tmpFile])
        if proc:
            # subprocess did not exit cleanly
            return HttpResponse(status=500)

        with open(tmpFile + '.pdf', 'r') as pdfFile:
            data = pdfFile.read()

        return HttpResponse(data, content_type='pdf')
