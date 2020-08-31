#!/bin/bash
grunt build &&
scp dist/vpaid-wrapper.js nneustroev@lga-kubnode47:/mnt/lga_emc_data/AdExchange/websites/projects.contextweb.com/nneustroev/vpaidtests/vpaid-wrapper.js &&
scp dist/vast-player--vpaid.swf nneustroev@lga-kubnode47:/mnt/lga_emc_data/AdExchange/websites/projects.contextweb.com/nneustroev/vpaidtests/vast-player--vpaid.swf
