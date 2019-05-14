#!/bin/bash
grunt build &&
scp dist/vpaid-wrapper.js nneustroev@lga-ds01:/mnt/lga-nas/Data/AdExchange/websites/projects.contextweb.com/nneustroev/vpaidtests/vpaid-wrapper.js &&
scp dist/vast-player--vpaid.swf nneustroev@lga-ds01:/mnt/lga-nas/Data/AdExchange/websites/projects.contextweb.com/nneustroev/vpaidtests/vast-player--vpaid.swf
